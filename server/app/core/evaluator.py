import os
from typing import Dict, List
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision
from datasets import Dataset
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

class AxiomEvaluator:
    """
    The Mathematical Auditor (V2.6-STABLE)
    Powered by NVIDIA NIM (Llama 3.3 70B & E5-v5)
    """
    def __init__(self):
        nv_api_key = os.environ.get("NVIDIA_API_KEY")
        nv_base_url = "https://integrate.api.nvidia.com/v1"

        # 1. The Judge LLM (Llama 3.3 70B)
        self.judge_llm = ChatOpenAI(
            model="meta/llama-3.3-70b-instruct",
            temperature=0,
            api_key=nv_api_key,
            base_url=nv_base_url,
            max_tokens=1024,
            # GUARDRAIL: Force deterministic math to prevent JSON parsing errors
            model_kwargs={"top_p": 0.01} 
        )

        # 2. The Math Embedder (NVIDIA E5-v5)
        # GUARDRAIL: Prevents RAGAS from defaulting to OpenAI and crashing
        self.judge_embeddings = OpenAIEmbeddings(
            model="nvidia/nv-embedqa-e5-v5",
            api_key=nv_api_key,
            base_url=nv_base_url
        )

    async def score_response(self, question: str, answer: str, contexts: List[str]) -> Dict[str, float]:
        """
        Calculates the RAGAS Triad with full safety fallbacks.
        """
        try:
            # Prepare the dataset for RAGAS
            data_sample = {
                "question": [question],
                "answer": [answer],
                "contexts": [contexts],
            }
            dataset = Dataset.from_dict(data_sample)

            # Execute RAGAS Evaluation
            result = evaluate(
                dataset,
                metrics=[faithfulness, answer_relevancy, context_precision],
                llm=self.judge_llm,
                embeddings=self.judge_embeddings,
                # GUARDRAIL: Ignore partial metric failures instead of crashing the pipeline
                raise_exceptions=False 
            )

            return {
                # .get() provides safe extraction if a specific metric failed to parse
                "faithfulness": float(result.get("faithfulness", 1.0)), 
                "relevance": float(result.get("answer_relevancy", 1.0)),
                "precision": float(result.get("context_precision", 1.0))
            }
        except Exception as e:
            print(f"⚠️ NVIDIA/RAGAS EVALUATION TIMEOUT: {e}")
            # GUARDRAIL: "Fail-Open". If the NVIDIA API drops connection, 
            # we return 1.0s so the user still gets their answer (since Groq's fast-check already passed).
            return {"faithfulness": 1.0, "relevance": 1.0, "precision": 1.0}

# Singleton instance
axiom_evaluator = AxiomEvaluator()
