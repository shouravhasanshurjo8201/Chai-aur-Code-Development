import jwt from "jsonwebtoken";

const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};

const tokenMaxAge = (token) => {
  const payload = jwt.decode(token);
  return payload?.exp
    ? Math.max(0, payload.exp * 1000 - Date.now())
    : undefined;
};

const setAuthCookies = (res, accessToken, refreshToken) =>
  res
    .cookie("accessToken", accessToken, {
      ...cookieOptions(),
      maxAge: tokenMaxAge(accessToken),
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions(),
      maxAge: tokenMaxAge(refreshToken),
    });

const clearAuthCookies = (res) =>
  res
    .clearCookie("accessToken", cookieOptions())
    .clearCookie("refreshToken", cookieOptions());

export { setAuthCookies, clearAuthCookies };
