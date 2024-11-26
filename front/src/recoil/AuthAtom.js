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
          return jwtDecode(parsedTokens.access); // Decode the access token
        }
      }
    } catch (error) {
      console.error("Error decoding token:", error);
    }
    return undefined; // Default value if decoding fails
  })(),
});

export const AuthAtom = atom({
  key: 'Token',
  default: (() => {
    try {
      const tokens = localStorage.getItem('tokens');
      return tokens ? JSON.parse(tokens) : undefined; // Parse and return tokens
    } catch (error) {
      console.error("Error parsing tokens from localStorage:", error);
      return undefined; // Default value if parsing fails
    }
  })(),
});

export const isLoginSelector = selector({
  key: 'isLoginSelector',
  get: ({ get }) => !!get(AuthAtom), // True if AuthAtom has a value
});

export const user_id = selector({
  key: 'user_id',
  get: ({ get }) => {
    const authUser = get(AuthUser);
    return authUser ? authUser.user_id : undefined; // Extract user_id from decoded token
  },
});

export const username = selector({
  key: 'username',
  get: ({ get }) => {
    const authUser = get(AuthUser);
    return authUser ? authUser.username : undefined; // Extract username from decoded token
  },
});
