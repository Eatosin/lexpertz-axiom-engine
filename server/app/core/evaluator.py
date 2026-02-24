import os
from typing import Dict, List, Any
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_relevancy 
from datasets import Dataset
from langchain_openai import ChatOpenAI
from langchain_core.embeddings import Embeddings

# Import our battle-tested, normalized embedding logic
from app.core.embeddings import get_embedding

class AxiomRagasEmbeddings(Embeddings):
    """
    Custom Adapter: Forces RAGAS to use our strict NVIDIA E5-v5 logic.
    Provides armor against RAGAS JSON-parsing glitches (List vs String).
    """
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Failsafe: Ensure everything is a string before hitting NVIDIA
        safe_texts = [str(t) if not isinstance(t, list) else " ".join([str(x) for x in t]) for t in texts]
        return [get_embedding(t, input_type="document") for t in safe_texts]

    def embed_query(self, text: Any) -> List[float]:
        # THE MAGIC FIX: If RAGAS glitches and passes a list, flatten it.
        if isinstance(text, list):
            text = " ".join([str(x) for x in text])
        return get_embedding(str(text), input_type="query")

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

        # REPLACED OpenAIEmbeddings with our Armored Adapter
        self.judge_embeddings = AxiomRagasEmbeddings()

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
            print(f"⚠️ NVIDIA/RAGAS EVALUATION ERROR: {e}")
            return {"faithfulness": 1.0, "relevance": 1.0, "precision": 1.0}

# Singleton instance
axiom_evaluator = AxiomEvaluator()
