import os
from typing import Dict, List
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision
from datasets import Dataset
from langchain_groq import ChatGroq

class AxiomEvaluator:
    """
    The Mathematical Auditor: Uses RAGAS metrics to score RAG performance.
    Powered by Groq Llama 3.3 70B as the Judge.
    """
    def __init__(self):
        # Use the Architect (70B) as the judge for high-fidelity scoring
        self.judge_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY")
        )

    async def score_response(self, question: str, answer: str, contexts: List[str]) -> Dict[str, float]:
        """
        Calculates the RAGAS Triad.
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
            # We override the default LLM with our Groq Judge
            result = evaluate(
                dataset,
                metrics=[faithfulness, answer_relevancy, context_precision],
                llm=self.judge_llm
            )

            return {
                "faithfulness": float(result["faithfulness"]),
                "relevance": float(result["answer_relevancy"]),
                "precision": float(result["context_precision"])
            }
        except Exception as e:
            print(f"⚠️ EVALUATION ERROR: {e}")
            return {"faithfulness": 0.0, "relevance": 0.0, "precision": 0.0}

# Singleton instance
axiom_evaluator = AxiomEvaluator()
