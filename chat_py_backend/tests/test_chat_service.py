from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

from services.chat_service import ChatService


@pytest.mark.asyncio
async def test_save_message():
    service = ChatService()
    inserted_id = ObjectId()
    mock_db = MagicMock()
    mock_db.messages = AsyncMock()
    mock_db.messages.insert_one.return_value = MagicMock(inserted_id=inserted_id)
    mock_db.chat_rooms = AsyncMock()
    mock_db.chat_rooms.find_one.return_value = None
    mock_db.chat_rooms.insert_one = AsyncMock()

    with patch.object(service, "_get_db", AsyncMock(return_value=mock_db)):
        message = await service.save_message(
            "alice@test.com",
            "bob@test.com",
            "Hola & adiós",
        )

    assert message.sender_email == "alice@test.com"
    assert message.receiver_email == "bob@test.com"
    assert message.content == "Hola & adiós"
    assert message.is_read is False
    mock_db.messages.insert_one.assert_called_once()
    call_args = mock_db.messages.insert_one.call_args[0][0]
    assert call_args["content"] == "Hola & adiós"
    assert isinstance(call_args["timestamp"], datetime)


class AsyncCursor:
    def __init__(self, documents):
        self._documents = documents

    def sort(self, *_args, **_kwargs):
        return self

    def limit(self, _limit):
        return self

    def __aiter__(self):
        async def _iter():
            for doc in self._documents:
                yield doc

        return _iter()


@pytest.mark.asyncio
async def test_get_chat_history():
    service = ChatService()
    msg_id = ObjectId()
    mock_db = MagicMock()
    mock_db.messages = MagicMock()
    mock_db.messages.find.return_value = AsyncCursor([
        {
            "_id": msg_id,
            "sender_email": "alice@test.com",
            "receiver_email": "bob@test.com",
            "content": "Hola",
            "timestamp": datetime.now(timezone.utc),
            "is_read": False,
        }
    ])

    with patch.object(service, "_get_db", AsyncMock(return_value=mock_db)):
        messages = await service.get_chat_history("alice@test.com", "bob@test.com")

    assert len(messages) == 1
    assert messages[0].content == "Hola"
    assert messages[0].sender_email == "alice@test.com"
