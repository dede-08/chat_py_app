// Servicio para datos de usuario en localStorage.
// Los tokens JWT se manejan exclusivamente via cookies httpOnly
// (seteadas por el backend, el navegador las envia automaticamente en cada request).

export class UserDataService {
  private static readonly EMAIL_KEY = 'userEmail';
  private static readonly USERNAME_KEY = 'username';

  //guardar datos de usuario
  static saveUserData(email: string, username?: string): void {
    localStorage.setItem(this.EMAIL_KEY, email);
    if (username) {
      localStorage.setItem(this.USERNAME_KEY, username);
    }
  }

  //obtener email del usuario
  static getUserEmail(): string | null {
    return localStorage.getItem(this.EMAIL_KEY);
  }

  //obtener nombre de usuario
  static getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  //limpiar datos de usuario
  static clearUserData(): void {
    localStorage.removeItem(this.EMAIL_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
  }

  //verificar si hay datos de usuario
  static hasUserData(): boolean {
    return this.getUserEmail() !== null;
  }
}


// Servicio de autenticacion basado en cookies httpOnly (backend) + localStorage (metadatos).
// El navegador envia las cookies httpOnly automaticamente en cada request.
// isAuthenticated() se basa en localStorage (seteado tras login exitoso),
// no en cookies (inaccesibles desde JS por ser httpOnly).
export const authService = {
  saveUserData: UserDataService.saveUserData.bind(UserDataService),
  getUserEmail: UserDataService.getUserEmail.bind(UserDataService),
  getUsername: UserDataService.getUsername.bind(UserDataService),
  clearUserData: UserDataService.clearUserData.bind(UserDataService),
  hasUserData: UserDataService.hasUserData.bind(UserDataService),

  isAuthenticated(): boolean {
    return this.hasUserData();
  },

  clearAll(): void {
    this.clearUserData();
  }
};

export default authService;