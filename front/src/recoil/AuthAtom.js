import { jwtDecode } from "jwt-decode";
import { atom, selector } from "recoil";

export const AuthUser = atom({
  key: 'user_data',
  default: (() => {
    try {
      const tokens = localStorage.getItem('tokens');
      if (tokens) {
        const parsedTokens = JSON.parse(tokens);
        if (parsedTokens.access) {
          return jwtDecode(parsedTokens.access);
        }
      }
    } catch (error) {
      console.error("Error decoding token:", error);
    }
    return undefined; 
  })(),
});

export const AuthAtom = atom({
  key: 'Token',
  default: (() => {
    try {
      const tokens = localStorage.getItem('tokens');
      return tokens ? JSON.parse(tokens) : undefined; 
    } catch (error) {
      console.error("Error parsing tokens from localStorage:", error);
      return undefined; 
    }
  })(),
});

export const isLoginSelector = selector({
  key: 'isLoginSelector',
  get: ({ get }) => !!get(AuthAtom), 
});

export const user_id = selector({
  key: 'user_id',
  get: ({ get }) => {
    const authUser = get(AuthUser);
    return authUser ? authUser.user_id : undefined; 
  },
});

export const username = selector({
  key: 'usernames',
  get: ({ get }) => {
    const authUser = get(AuthUser);
    return authUser ? authUser.username : undefined; 
  },
});
