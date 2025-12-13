# ws_manager.py
class DummyManager:
    def send_to_user(self, user_id, payload):
        print("WS send", user_id, payload)

manager = DummyManager()
