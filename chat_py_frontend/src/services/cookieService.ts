interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

//clase para manejar cookies de forma segura
class CookieManager {
  //establecer una cookie con opciones de seguridad
  static setCookie(name: string, value: string, options: CookieOptions = {}): void {
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (options.maxAge) {
      cookieString += `; max-age=${options.maxAge}`;
    }
    
    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`;
    }
    
    if (options.path) {
      cookieString += `; path=${options.path}`;
    }
    
    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }
    
    if (options.secure) {
      cookieString += '; secure';
    }
    
    if (options.httpOnly) {
      cookieString += '; httponly';
    }
    
    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }
    
    document.cookie = cookieString;
  }

  //obtener el valor de una cookie
  static getCookie(name: string): string | null {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      if (!c) continue;
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  //eliminar una cookie
  static deleteCookie(name: string, options: { path?: string; domain?: string } = {}): void {
    this.setCookie(name, '', {
      ...options,
      maxAge: -1,
      expires: new Date(0)
    });
  }

  //verificar si una cookie existe
  static hasCookie(name: string): boolean {
    return this.getCookie(name) !== null;
  }
}

//servicio especializado para tokens de autenticación
export class TokenService {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  
  //guardar tokens de autenticación de forma segura
  static saveTokens(accessToken: string, refreshToken: string): void {
    //access token con corta duración (1 hora por defecto)
    CookieManager.setCookie(this.ACCESS_TOKEN_KEY, accessToken, {
      maxAge: 60 * 60, // 1 hora en segundos
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
      // Nota: httpOnly no se puede establecer desde JavaScript
    });

    //refresh token con larga duración (7 días por defecto)
    CookieManager.setCookie(this.REFRESH_TOKEN_KEY, refreshToken, {
      maxAge: 7 * 24 * 60 * 60, // 7 días en segundos
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }

  //obtener el access token actual
  static getAccessToken(): string | null {
    return CookieManager.getCookie(this.ACCESS_TOKEN_KEY);
  }

  //obtener el refresh token actual
  static getRefreshToken(): string | null {
    return CookieManager.getCookie(this.REFRESH_TOKEN_KEY);
  }

  //verificar si hay tokens disponibles
  static hasTokens(): boolean {
    return this.hasAccessToken() && this.hasRefreshToken();
  }

  //verificar si hay access token
  static hasAccessToken(): boolean {
    return CookieManager.hasCookie(this.ACCESS_TOKEN_KEY);
  }

  //verificar si hay refresh token
  static hasRefreshToken(): boolean {
    return CookieManager.hasCookie(this.REFRESH_TOKEN_KEY);
  }

  //limpiar todos los tokens
  static clearTokens(): void {
    CookieManager.deleteCookie(this.ACCESS_TOKEN_KEY, { path: '/' });
    CookieManager.deleteCookie(this.REFRESH_TOKEN_KEY, { path: '/' });
  }

  //migrar desde localStorage (para transición)
  //esta función debe eliminarse después de la migración completa
  static migrateFromLocalStorage(): void {
    const accessFromStorage = localStorage.getItem('access_token');
    const refreshFromStorage = localStorage.getItem('refresh_token');
    
    if (accessFromStorage && refreshFromStorage) {
      this.saveTokens(accessFromStorage, refreshFromStorage);
      //limpiar localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
    }
  }
}

/**
 * Servicio para datos de usuario no sensibles
 * Estos pueden quedarse en localStorage ya que no comprometen la seguridad
 */
export class UserDataService {
  private static readonly EMAIL_KEY = 'userEmail';
  private static readonly USERNAME_KEY = 'username';

  /**
   * Guardar datos de usuario
   */
  static saveUserData(email: string, username?: string): void {
    localStorage.setItem(this.EMAIL_KEY, email);
    if (username) {
      localStorage.setItem(this.USERNAME_KEY, username);
    }
  }

  /**
   * Obtener email del usuario
   */
  static getUserEmail(): string | null {
    return localStorage.getItem(this.EMAIL_KEY);
  }

  /**
   * Obtener nombre de usuario
   */
  static getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  /**
   * Limpiar datos de usuario
   */
  static clearUserData(): void {
    localStorage.removeItem(this.EMAIL_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
  }

  /**
   * Verificar si hay datos de usuario
   */
  static hasUserData(): boolean {
    return this.getUserEmail() !== null;
  }
}

/**
 * Servicio combinado de autenticación
 */
export const authService = {
  // Métodos de tokens
  saveTokens: TokenService.saveTokens.bind(TokenService),
  getAccessToken: TokenService.getAccessToken.bind(TokenService),
  getRefreshToken: TokenService.getRefreshToken.bind(TokenService),
  hasTokens: TokenService.hasTokens.bind(TokenService),
  hasAccessToken: TokenService.hasAccessToken.bind(TokenService),
  hasRefreshToken: TokenService.hasRefreshToken.bind(TokenService),
  clearTokens: TokenService.clearTokens.bind(TokenService),
  migrateFromLocalStorage: TokenService.migrateFromLocalStorage.bind(TokenService),

  // Métodos de datos de usuario
  saveUserData: UserDataService.saveUserData.bind(UserDataService),
  getUserEmail: UserDataService.getUserEmail.bind(UserDataService),
  getUsername: UserDataService.getUsername.bind(UserDataService),
  clearUserData: UserDataService.clearUserData.bind(UserDataService),
  hasUserData: UserDataService.hasUserData.bind(UserDataService),

  // Métodos combinados
  // Con cookies httpOnly el token no es legible desde JS; usamos datos de usuario
  // guardados en login. Se limpian en logout o cuando el servidor devuelve 401.
  isAuthenticated(): boolean {
    return this.hasUserData();
  },

  clearAll(): void {
    this.clearTokens();
    this.clearUserData();
  }
};

export default authService;