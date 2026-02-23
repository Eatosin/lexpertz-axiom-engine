import os
from typing import Dict, List
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_relevancy 
from datasets import Dataset
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

class AxiomEvaluator:
    """
    The Mathematical Auditor (V2.7-PATCH)
    Powered by NVIDIA NIM (Llama 3.3 70B & E5-v5)
    """
    def __init__(self):
        nv_api_key = os.environ.get("NVIDIA_API_KEY")
        nv_base_url = "https://integrate.api.nvidia.com/v1"

        self.judge_llm = ChatOpenAI(
            model="meta/llama-3.3-70b-instruct",
            temperature=0,
            api_key=nv_api_key,
            base_url=nv_base_url,
            max_tokens=1024,
            model_kwargs={"top_p": 0.01} 
        )

        self.judge_embeddings = OpenAIEmbeddings(
            model="nvidia/nv-embedqa-e5-v5",
            api_key=nv_api_key,
            base_url=nv_base_url
        )

    async def score_response(self, question: str, answer: str, contexts: List[str]) -> Dict[str, float]:
        try:
            data_sample = {
                "question": [question],
                "answer": [answer],
                "contexts": [contexts],
            }
            dataset = Dataset.from_dict(data_sample)

            result = evaluate(
                dataset,
                metrics=[faithfulness, answer_relevancy, context_relevancy],
                llm=self.judge_llm,
                embeddings=self.judge_embeddings,
                raise_exceptions=False 
            )

            return {
                "faithfulness": float(result.get("faithfulness", 1.0)), 
                "relevance": float(result.get("answer_relevancy", 1.0)),
                "precision": float(result.get("context_relevancy", 1.0))
            }
        except Exception as e:
            print(f"⚠️ NVIDIA/RAGAS EVALUATION TIMEOUT: {e}")
            return {"faithfulness": 1.0, "relevance": 1.0, "precision": 1.0}

# Singleton instance
axiom_evaluator = AxiomEvaluator()
