"""LangChain agent service with Claude."""

import os
from typing import Optional, Dict, Any, List
from langchain_anthropic import ChatAnthropic
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.tools import BaseTool

from backend.config import settings
from backend.prompts.system import SYSTEM_PROMPT


# Configure LangSmith tracing
if settings.langsmith_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
    print(f"LangSmith tracing enabled for project: {settings.langsmith_project}")
else:
    print("LangSmith tracing disabled (no API key provided)")


class AgentService:
    """
    LangChain agent service using Claude.

    This service manages the conversational agent that processes user requests
    and coordinates tool usage.
    """

    def __init__(self, tools: Optional[List[BaseTool]] = None):
        """
        Initialize the agent service.

        Args:
            tools: List of LangChain tools available to the agent
        """
        self.tools = tools or []
        self.llm = self._create_llm()
        self.agent_executor = self._create_agent()

    def _create_llm(self) -> ChatAnthropic:
        """Create the Claude LLM instance."""
        return ChatAnthropic(
            model="claude-sonnet-4-5-20250929",
            api_key=settings.anthropic_api_key,
            temperature=0.7,
            max_tokens=1024,
        )

    def _create_agent(self) -> AgentExecutor:
        """Create the LangChain agent with tools."""
        # Create prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        # Create agent
        agent = create_tool_calling_agent(self.llm, self.tools, prompt)

        # Create executor
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5,
            return_intermediate_steps=True,  # CRITICAL: Return intermediate steps for action extraction
        )

    def process_request(
        self,
        user_input: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a user request through the agent.

        Args:
            user_input: User's text input (from ASR)
            chat_history: Optional conversation history
            metadata: Optional metadata for LangSmith tracing

        Returns:
            Dictionary with agent response and metadata
        """
        try:
            # Convert chat history to LangChain messages
            history_messages = []
            if chat_history:
                for msg in chat_history:
                    if msg["role"] == "user":
                        history_messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        history_messages.append(AIMessage(content=msg["content"]))

            # Prepare run config for LangSmith
            run_config = {}
            if metadata:
                run_config["metadata"] = metadata
                run_config["tags"] = metadata.get("tags", [])

            # Invoke agent (with LangSmith tracing if enabled)
            result = self.agent_executor.invoke(
                {
                    "input": user_input,
                    "chat_history": history_messages,
                },
                config=run_config if run_config else None
            )

            return {
                "success": True,
                "response": result["output"],
                "intermediate_steps": result.get("intermediate_steps", []),
                "run_id": run_config.get("run_id") if run_config else None,
            }

        except Exception as e:
            print(f"Agent error: {str(e)}")
            return {
                "success": False,
                "response": f"I encountered an error processing your request. Please try again.",
                "error": str(e),
            }

    def add_tool(self, tool: BaseTool):
        """
        Add a new tool to the agent.

        Args:
            tool: LangChain tool to add
        """
        self.tools.append(tool)
        # Recreate agent with new tools
        self.agent_executor = self._create_agent()

    def add_tools(self, tools: List[BaseTool]):
        """
        Add multiple tools to the agent.

        Args:
            tools: List of LangChain tools to add
        """
        self.tools.extend(tools)
        # Recreate agent with new tools
        self.agent_executor = self._create_agent()


# Global agent service instance
_agent_service: Optional[AgentService] = None


def get_agent_service() -> AgentService:
    """
    Get or create the global agent service instance.

    Returns:
        AgentService instance
    """
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service


def init_agent_with_tools(tools: List[BaseTool]):
    """
    Initialize the agent service with tools.

    Args:
        tools: List of LangChain tools
    """
    global _agent_service
    _agent_service = AgentService(tools=tools)
