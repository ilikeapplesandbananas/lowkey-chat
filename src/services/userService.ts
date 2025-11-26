import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'lowkey_user_id';
const CONVERSATION_IDS_KEY = 'lowkey_conversation_ids';

export const userService = {
  getUserId: (): string => {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  },

  getConversationIds: (): string[] => {
    const stored = localStorage.getItem(CONVERSATION_IDS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addConversationId: (id: string) => {
    const ids = userService.getConversationIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(CONVERSATION_IDS_KEY, JSON.stringify(ids));
    }
  },

  removeConversationId: (id: string) => {
    const ids = userService.getConversationIds();
    const newIds = ids.filter(existingId => existingId !== id);
    localStorage.setItem(CONVERSATION_IDS_KEY, JSON.stringify(newIds));
  }
};
