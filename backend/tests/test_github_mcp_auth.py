import asyncio

from src.mcp_servers.github_mcp import _repo


class FakeClient:
    def __init__(self, login: str):
        self._login = login

    async def get_current_user_login(self) -> str:
        return self._login


def test_repo_uses_authenticated_login_when_owner_missing():
    async def run():
        client = FakeClient("pat-user")
        owner, repo = await _repo(client, {"owner": "", "repo": "my-repo"})
        assert (owner, repo) == ("pat-user", "my-repo")

    asyncio.run(run())


def test_repo_keeps_explicit_owner_when_given():
    async def run():
        client = FakeClient("pat-user")
        owner, repo = await _repo(client, {"owner": "octocat", "repo": "hello-world"})
        assert (owner, repo) == ("octocat", "hello-world")

    asyncio.run(run())


def test_repo_resolves_placeholder_owner_from_pat_user():
    async def run():
        client = FakeClient("pat-user")
        owner, repo = await _repo(client, {"owner": "<authenticated_user>", "repo": "my-repo"})
        assert (owner, repo) == ("pat-user", "my-repo")

    asyncio.run(run())


def test_tool_delete_branch():
    import json
    from src.mcp_servers.github_mcp import tool_delete_branch

    class FakeDeleteClient:
        def __init__(self, login: str):
            self._login = login
            self.deleted_paths = []

        async def get_current_user_login(self) -> str:
            return self._login

        async def delete(self, path: str, token=None):
            self.deleted_paths.append(path)
            return True

    async def run():
        client = FakeDeleteClient("test-owner")
        res = await tool_delete_branch(client, {"repo": "my-repo", "branch": "feature-test"})
        data = json.loads(res)
        assert data["status"] == "deleted"
        assert data["branch"] == "feature-test"
        assert client.deleted_paths == ["repos/test-owner/my-repo/git/refs/heads/feature-test"]

    asyncio.run(run())


def test_stream_chat_sets_tool_choice_auto_when_tools_exist(monkeypatch):
    class FakeChunk:
        def __init__(self, content=None):
            self.choices = [type("Choice", (), {"delta": type("Delta", (), {"content": content, "tool_calls": None})()})()]

    class FakeStream:
        def __init__(self):
            self._chunks = [FakeChunk(content="")]

        def __aiter__(self):
            return self

        async def __anext__(self):
            if not self._chunks:
                raise StopAsyncIteration
            return self._chunks.pop(0)

    class FakeCompletions:
        def __init__(self):
            self.kwargs = None

        async def create(self, **kwargs):
            self.kwargs = kwargs
            return FakeStream()

    class FakeClient:
        instance = None

        def __init__(self, *args, **kwargs):
            self.chat = type("Chat", (), {"completions": FakeCompletions()})()
            FakeClient.instance = self

    monkeypatch.setattr("src.services.chat_service.AsyncOpenAI", FakeClient)

    async def run():
        from src.services.chat_service import stream_chat

        async for _ in stream_chat(
            user_content="Create a branch",
            model_id="fake-model",
            endpoint_url="https://example.com/v1",
            api_key="test-key",
            history=[],
            mcp_servers=[type("McpServer", (), {"name": "github", "server_url": "https://github.example.com/mcp", "category": "source control", "auth_token_enc": None, "transport": "http", "stdio_command": None})()],
        ):
            pass

        first_call = FakeClient.instance.chat.completions.kwargs
        assert first_call["tool_choice"] == "auto"

    asyncio.run(run())


def test_stream_chat_tool_followup_error_gracefully_handled(monkeypatch):
    import json

    class FakeFunction:
        def __init__(self, name, arguments):
            self.name = name
            self.arguments = arguments

    class FakeToolDelta:
        def __init__(self, index, name, arguments):
            self.index = index
            self.id = "call_123"
            self.function = FakeFunction(name, arguments)

    class FakeChunk:
        def __init__(self, content=None, tool_calls=None):
            self.choices = [
                type("Choice", (), {"delta": type("Delta", (), {"content": content, "tool_calls": tool_calls})()})()
            ]

    class FakeStream:
        def __init__(self, chunks):
            self._chunks = list(chunks)

        def __aiter__(self):
            return self

        async def __anext__(self):
            if not self._chunks:
                raise StopAsyncIteration
            return self._chunks.pop(0)

    class FakeCompletions:
        def __init__(self):
            self.calls = []

        async def create(self, **kwargs):
            self.calls.append(kwargs)
            if len(self.calls) == 1:
                # First turn: returns tool call for github_create_branch
                tc = FakeToolDelta(0, "github_create_branch", json.dumps({"owner": "octocat", "repo": "test-repo", "branch": "feature-x"}))
                return FakeStream([FakeChunk(tool_calls=[tc])])
            else:
                # Second turn: simulate Groq error
                raise RuntimeError("Tool choice is none, but model called a tool")

    class FakeClient:
        instance = None

        def __init__(self, *args, **kwargs):
            self.chat = type("Chat", (), {"completions": FakeCompletions()})()
            FakeClient.instance = self

    monkeypatch.setattr("src.services.chat_service.AsyncOpenAI", FakeClient)

    # Mock tool execution to succeed
    async def fake_execute(*args, **kwargs):
        return (
            [
                'data: {"type": "tool_result", "id": "call_123", "tool_name": "github_create_branch", "server_name": "github", "output": "{\\"status\\": \\"created\\", \\"branch\\": \\"feature-x\\", \\"repo\\": \\"octocat/test-repo\\"}", "duration_ms": 100, "success": true}\n\n'
            ],
            '{"status": "created", "branch": "feature-x", "repo": "octocat/test-repo"}',
        )

    monkeypatch.setattr("src.services.chat_service._execute_mcp_tool", fake_execute)

    async def run():
        from src.services.chat_service import stream_chat

        events = []
        async for event in stream_chat(
            user_content="Create branch feature-x",
            model_id="openai/gpt-oss-20b",
            endpoint_url="https://api.groq.com/openai/v1",
            api_key="gsk-test",
            history=[],
            mcp_servers=[type("McpServer", (), {"name": "github", "server_url": "https://github.example.com/mcp", "category": "source control", "auth_token_enc": None, "transport": "http", "stdio_command": None})()],
        ):
            events.append(event)

        # Ensure that instead of failing with an error event, it synthesized confirmation and completed
        event_types = [json.loads(e.replace("data: ", "").strip()).get("type") for e in events if e.startswith("data:")]
        assert "error" not in event_types
        assert "done" in event_types

        # Verify second turn follow-up message instructed the model to accurately state what happened
        calls = FakeClient.instance.chat.completions.calls
        assert len(calls) == 2
        second_msgs = calls[1]["messages"]
        followup_user_msg = second_msgs[-1]
        assert "Do NOT claim an action" in followup_user_msg["content"]

    asyncio.run(run())


def test_stream_chat_multiple_parallel_tool_calls(monkeypatch):
    import json

    class FakeFunction:
        def __init__(self, name, arguments):
            self.name = name
            self.arguments = arguments

    class FakeToolDelta:
        def __init__(self, index, call_id, name, arguments):
            self.index = index
            self.id = call_id
            self.function = FakeFunction(name, arguments)

    class FakeChunk:
        def __init__(self, content=None, tool_calls=None):
            self.choices = [
                type("Choice", (), {"delta": type("Delta", (), {"content": content, "tool_calls": tool_calls})()})()
            ]

    class FakeStream:
        def __init__(self, chunks):
            self._chunks = list(chunks)

        def __aiter__(self):
            return self

        async def __anext__(self):
            if not self._chunks:
                raise StopAsyncIteration
            return self._chunks.pop(0)

    class FakeCompletions:
        def __init__(self):
            self.calls = []

        async def create(self, **kwargs):
            self.calls.append(kwargs)
            if len(self.calls) == 1:
                # First turn: returns TWO tool calls simultaneously
                tc1 = FakeToolDelta(0, "call_1", "github_list_branches", json.dumps({"repo": "test-repo"}))
                tc2 = FakeToolDelta(1, "call_2", "github_list_issues", json.dumps({"repo": "test-repo"}))
                return FakeStream([FakeChunk(tool_calls=[tc1, tc2])])
            else:
                # Second turn: final text answer
                return FakeStream([FakeChunk(content="Found 2 branches and 3 issues.")])

    class FakeClient:
        instance = None

        def __init__(self, *args, **kwargs):
            self.chat = type("Chat", (), {"completions": FakeCompletions()})()
            FakeClient.instance = self

    monkeypatch.setattr("src.services.chat_service.AsyncOpenAI", FakeClient)

    executed_tools = []

    async def fake_execute(server, tool_name, args, call_id):
        executed_tools.append((tool_name, call_id))
        return (
            [f'data: {{"type": "tool_result", "id": "{call_id}", "tool_name": "{tool_name}", "server_name": "github", "output": "ok", "duration_ms": 50, "success": true}}\n\n'],
            "ok",
        )

    monkeypatch.setattr("src.services.chat_service._execute_mcp_tool", fake_execute)

    async def run():
        from src.services.chat_service import stream_chat

        events = []
        async for event in stream_chat(
            user_content="List branches and issues",
            model_id="gpt-4o",
            endpoint_url="https://api.openai.com/v1",
            api_key="sk-test",
            history=[],
            mcp_servers=[type("McpServer", (), {"name": "github", "server_url": "https://github.example.com/mcp", "category": "source control", "auth_token_enc": None, "transport": "http", "stdio_command": None})()],
        ):
            events.append(event)

        # Both tools must have executed
        assert len(executed_tools) == 2
        assert executed_tools[0] == ("github_list_branches", "call_1")
        assert executed_tools[1] == ("github_list_issues", "call_2")

        # The stream should have received content and finished with done
        event_types = [json.loads(e.replace("data: ", "").strip()).get("type") for e in events if e.startswith("data:")]
        assert "content" in event_types
        assert "done" in event_types

    asyncio.run(run())


