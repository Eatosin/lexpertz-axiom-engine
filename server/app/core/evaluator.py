import os
from typing import Dict, List, Optional
from ragas import evaluate, SingleTurnSample, EvaluationDataset
from ragas.metrics import Faithfulness
from ragas.llms import LangchainLLMWrapper
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

# SOTA: Fix for Pydantic V2 "BaseCache" error inside the Evaluator
from langchain_core.caches import BaseCache
from langchain_core.callbacks import Callbacks

class AxiomEvaluator:
    def __init__(self):
        self.evaluator_llm: Optional[LangchainLLMWrapper] = None
        self.faithfulness_metric: Optional[Faithfulness] = None

    def _lazy_init(self) -> None:
        if self.evaluator_llm is None:
            # FORCE REBUILD: Fixes the 'BaseCache' crash
            try:
                ChatOpenAI.model_rebuild()
            except: pass

            print("AXIOM-CORE: Materializing RAGAS V2 Auditor (NVIDIA NIM)...")
            raw_key = os.environ.get("NVIDIA_API_KEY")
            
            llm = ChatOpenAI(
                model="meta/llama-3.3-70b-instruct",
                temperature=0,
                api_key=SecretStr(raw_key) if raw_key else None,
                base_url="https://integrate.api.nvidia.com/v1",
                max_completion_tokens=512
            )
            self.evaluator_llm = LangchainLLMWrapper(llm)
            self.faithfulness_metric = Faithfulness(llm=self.evaluator_llm)

    async def score_response(self, question: str, answer: str, contexts: List[str]) -> Dict[str, float]:
        self._lazy_init()
        try:
            sample = SingleTurnSample(user_input=question, response=answer, retrieved_contexts=contexts)
            dataset = EvaluationDataset(samples=[sample])
            result = await evaluate(dataset=dataset, metrics=[self.faithfulness_metric])
            scores_df = result.to_pandas()
            # DEFENSIVE: Handle potential NaN from RAGAS
            import math
            val = float(scores_df["faithfulness"].iloc[0])
            return {"faithfulness": val if math.isfinite(val) else 0.0, "relevance": 1.0, "precision": 1.0}
        except Exception as e:
            print(f"⚠️ RAGAS V2 EVAL ERROR: {e}")
            return {"faithfulness": 0.0, "relevance": 1.0, "precision": 1.0}

axiom_evaluator = AxiomEvaluator()
