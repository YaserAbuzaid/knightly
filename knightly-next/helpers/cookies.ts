export function setCookie(name: string, value: string, days = 7) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); // expiration in days
  const expires = "expires=" + date.toUTCString();
  document.cookie = `${name}=${value};${expires};path=/`; // path=/ makes the cookie accessible throughout the entire site
}

export function getCookie(name: string) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null; // returns null if the cookie is not found
}
