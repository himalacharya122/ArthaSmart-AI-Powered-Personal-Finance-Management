export interface Conversation {
  id: number;
  title: string;
  is_active: boolean;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionData {
  type: 'create_expense' | 'create_income' | 'update_expense' | 'delete_expense' | 'update_income' | 'delete_income';
  data: {
    amount?: number;
    category?: string;
    merchant?: string;
    description?: string;
    source_name?: string;
    date?: string;
    expense_id?: number;
    income_id?: number;
    reason?: string;
  };
}

export interface ActionResult {
  type: string;
  id?: number;
  amount?: number;
  category?: string | null;
  merchant?: string;
  source_name?: string;
  date?: string;
  deleted?: boolean;
  updated_fields?: string[];
  error?: string;
}

export type ActionStatus = 'none' | 'pending' | 'confirmed' | 'rejected';

export interface MessageEntities {
  actions?: ActionData[];
  action_status?: ActionStatus;
  action_results?: {
    executed?: ActionResult[];
    errors?: ActionResult[];
  };
}

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  entities?: MessageEntities;
  expense?: number | null;
  income?: number | null;
  tokens_used?: number | null;
  response_time_ms?: number | null;
  created_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  user_message: Message;
  assistant_message: Message;
}

export interface ConfirmActionResponse {
  message: Message;
  action_results: {
    executed: ActionResult[];
    errors: ActionResult[];
  };
}
