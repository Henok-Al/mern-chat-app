export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
  };
  content: string;
  chatRoom: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface SendMessageData {
  senderId: string;
  content: string;
  chatRoom?: string;
}