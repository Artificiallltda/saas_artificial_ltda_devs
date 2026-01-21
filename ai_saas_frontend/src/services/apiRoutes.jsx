// Normaliza a base da API e aplica fallback seguro
const rawBase = (import.meta.env.VITE_API_BASE_URL ?? "").toString().trim();
// remove barras finais para evitar "//api"
const normalizedBase = rawBase.replace(/\/+$/, "");
// se não houver base definida, usa caminho relativo (mesma origem) -> "/api"
const API_BASE = `${normalizedBase}/api`;


export const authRoutes = {
  // register: `${API_BASE}/auth/`,                                 // POST → criar usuário
  login: `${API_BASE}/auth/login`,                               // POST → login
  logout: `${API_BASE}/auth/logout`,                             // POST → logout (JWT)
  verifyPassword: `${API_BASE}/auth/verify-password`,            // POST → verificar senha atual
  requestPasswordReset: `${API_BASE}/auth/request-password-reset`, // POST → solicitar link reset
  resetPassword: (token) => `${API_BASE}/auth/reset-password/${token}`, // POST → redefinir com token
};

export const emailRoutes = {
  requestEmailCode: `${API_BASE}/email/request-email-code`,      // POST → solicita código de verificação (cadastro)
  verifyEmailCode: `${API_BASE}/email/verify-email-code`,        // POST → verifica código de verificação
  sendSecurityCode: `${API_BASE}/email/send-security-code`,      // POST → envia código de segurança (JWT)
  verifySecurityCode: `${API_BASE}/email/verify-security-code`,  // POST → verifica código de segurança (JWT)
};

export const profileRoutes = {
  updatePhoto: (userId) => `${API_BASE}/users/${userId}/perfil-photo`, // PUT
  deletePhoto: (userId) => `${API_BASE}/users/${userId}/perfil-photo`, // DELETE
  getPhoto: (userId) => `${API_BASE}/users/${userId}/perfil-photo`,    // GET
};

export const userRoutes = {
  getUser: (userId) => `${API_BASE}/users/${userId}`,            // GET user info
  updateUser: (userId) => `${API_BASE}/users/${userId}`,         // PUT update user
  deleteUser: (userId) => `${API_BASE}/users/${userId}`,         // DELETE user
  getCurrentUser: () => `${API_BASE}/users/me`,                  // GET logged user
};

export const adminRoutes = {
  listUsers: () => `${API_BASE}/admin/users`,                       // GET all users
  createUser: () => `${API_BASE}/admin/users`,                      // POST → criar user
  updateUserPlan: (id) => `${API_BASE}/admin/users/${id}/plan`,     // PUT → atualizar plano
  updateUserStatus: (id) => `${API_BASE}/admin/users/${id}/status`, // PUT → atualizar role e is_active
  usage: (qs = "") => `${API_BASE}/admin/usage${qs ? `?${qs}` : ""}`,
};


export const projectRoutes = {
  list: `${API_BASE}/projects/`,                     // GET → lista projetos do usuário logado
  create: `${API_BASE}/projects/`,                   // POST → cria projeto
  get: (projectId) => `${API_BASE}/projects/${projectId}`,        // GET → detalhes
  update: (projectId) => `${API_BASE}/projects/${projectId}`,     // PUT → atualizar
  delete: (projectId) => `${API_BASE}/projects/${projectId}`,     // DELETE → remover
  addContent: (projectId) => `${API_BASE}/projects/${projectId}/add-content`,   // POST → vincular conteúdo
  removeContent: (projectId) => `${API_BASE}/projects/${projectId}/remove-content`, // POST → desvincular conteúdo
  updateContents: (projectId) => `${API_BASE}/projects/${projectId}/update-contents`,
};

export const generatedContentRoutes = {
  list: `${API_BASE}/contents/`,                // GET → lista todos conteúdos do usuário
  create: `${API_BASE}/contents/`,              // POST → criar conteúdo gerado
  get: (contentId) => `${API_BASE}/contents/${contentId}`,   // GET → detalhes conteúdo
  delete: (contentId) => `${API_BASE}/contents/${contentId}`, // DELETE → deletar conteúdo
  deleteBatch: `${API_BASE}/contents/batch`, // NOVA ROTA
  getImage: (contentId) => `${API_BASE}/contents/images/${contentId}`,
  getVideo: (id) => `${API_BASE}/contents/videos/${id}`,
};

export const notificationRoutes = {
  list: `${API_BASE}/notifications/`,
  create: `${API_BASE}/notifications/`,
  markRead: `${API_BASE}/notifications/mark-read`, // marca todas
  markSingle: (id) => `${API_BASE}/notifications/${id}/mark-read`, // marca só 1
  delete: (id) => `${API_BASE}/notifications/${id}` // delete uma
};

export const plansRoutes = {
  list: `${API_BASE}/plans/`,   // GET → lista todos os planos
}; 

export const aiRoutes = {
  generateText: `${API_BASE}/ai/generate-text`,  // POST → gerar texto via IA
  generateImage: `${API_BASE}/ai/generate-image`,
  generateVideo: `${API_BASE}/ai/generate-video`,
};

export const chatRoutes = {
  list: `${API_BASE}/chats/`,                         // GET → lista todos os chats do usuário
  create: `${API_BASE}/chats/`,                       // POST → cria novo chat
  get: (chatId) => `${API_BASE}/chats/${chatId}`,     // GET → detalhes de um chat específico
  update: (chatId) => `${API_BASE}/chats/${chatId}`,  // PUT → atualizar título, prompt ou modelo
  delete: (chatId) => `${API_BASE}/chats/${chatId}`,  // DELETE → remover chat
  archive: (chatId) => `${API_BASE}/chats/${chatId}/archive`,    // PATCH → arquivar chat
  unarchive: (chatId) => `${API_BASE}/chats/${chatId}/unarchive`,// PATCH → desarquivar chat
  messages: (chatId) => `${API_BASE}/chats/${chatId}?with_messages=true`, // GET → lista mensagens
  attachments: (attachmentId) => `${API_BASE}/chats/attachments/${attachmentId}`,
};