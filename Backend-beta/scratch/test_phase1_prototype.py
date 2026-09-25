import os
import sys
import json
import logging
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from Clonellm.clone_engine import PersonaCloneEngine, get_clone_engine
from clonellm import CloneLLM
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables.history import RunnableWithMessageHistory
from operator import itemgetter
import functools
from clonellm.memory import get_session_history

class EnhancedCloneLLM(CloneLLM):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def _get_clean_rag_prompt(self, with_history: bool = True) -> ChatPromptTemplate:
        messages = []
        for prompt in (self.system_prompts or []):
            messages.append(("system", prompt))
        if self.user_profile:
            messages.append(("system", f"PERSONAL PROFILE & DEMOGRAPHICS:\n{self._user_profile}"))
        messages.append(("system", "RELEVANT RETRIEVED MEMORIES:\n{context}\n(Integrate these memories naturally when relevant. Do NOT fabricate memories contrary to this background.)"))
        if with_history:
            messages.append(MessagesPlaceholder(variable_name="chat_history"))
        # Pure natural human input - NO "Question:\n " prefix!
        messages.append(("human", "{input}"))
        return ChatPromptTemplate.from_messages(messages)

    def _get_rag_chain_with_history(self) -> RunnableWithMessageHistory:
        prompt = self._get_clean_rag_prompt(with_history=True)
        context = itemgetter("input") | self._get_retriever() if self.embedding else lambda x: self.context
        first_step = RunnablePassthrough.assign(context=context)
        rag_chain = first_step | prompt | self._llm | StrOutputParser()

        if not self.memory:
            max_memory_size = 0
        elif (isinstance(self.memory, bool) and self.memory) or self.memory == -1:
            max_memory_size = -1
        else:
            max_memory_size = int(self.memory)

        get_session_history_ = functools.partial(get_session_history, max_memory_size=max_memory_size)

        return RunnableWithMessageHistory(
            rag_chain,
            get_session_history_,
            input_messages_key="input",
            history_messages_key="chat_history",
            output_parser=StrOutputParser(),
        )

# Test the prototype
print("Prototype defined successfully.")
