// Simple auth mock for web demo (no backend / SQL dependency)

export const DEMO_USERS = {
  "admin@fashion.ai": {
    password: "Admin@123",
    user: { id: 1, email: "admin@fashion.ai", full_name: "Quản trị viên", role: "admin" },
  },
  "staff@fashion.ai": {
    password: "Staff@123",
    user: { id: 2, email: "staff@fashion.ai", full_name: "Nhân viên", role: "staff" },
  },
  "customer@fashion.ai": {
    password: "Customer@123",
    user: { id: 3, email: "customer@fashion.ai", full_name: "Khách hàng Demo", role: "customer" },
  },
};

export function makeMockToken(email) {
  // Token only used by frontend to skip /me in mock mode
  return `mock_${email}`;
}

export function mockLogin(email, password) {
  const rec = DEMO_USERS[email];
  if (!rec) throw new Error("User not found");
  if (rec.password !== password) throw new Error("Bcrypt verify failed");
  return {
    access_token: makeMockToken(email),
    token_type: "bearer",
    user: rec.user,
  };
}

export function mockMe(token) {
  if (!token || typeof token !== "string") throw new Error("Unauthorized");
  if (!token.startsWith("mock_")) throw new Error("Unauthorized");
  const email = token.slice("mock_".length);
  const rec = DEMO_USERS[email];
  if (!rec) throw new Error("Unauthorized");
  return rec.user;
}

