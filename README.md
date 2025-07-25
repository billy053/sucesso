# 🏪 Sistema de Gestão Vitana

Sistema completo de gestão para depósitos de bebidas com front-end React e back-end Node.js integrados.

## 🚀 Deploy no Railway

### Pré-requisitos
1. Conta no [Railway](https://railway.app)
2. Repositório Git com o código

### Passos para Deploy

1. **Conectar Repositório**
   ```bash
   # No Railway Dashboard
   - New Project → Deploy from GitHub repo
   - Selecione seu repositório
   ```

2. **Configurar Variáveis de Ambiente**
   ```bash
   NODE_ENV=production
   PORT=3001
   DATABASE_PATH=/app/data/vitana.db
   JWT_SECRET=vitana-jwt-secret-key-2024
   SUPER_ADMIN_PASSWORD=SuperAdmin2024!
   ```

3. **Deploy Automático**
   - O Railway detectará automaticamente o `nixpacks.toml`
   - Build será executado automaticamente
   - Aplicação ficará disponível na URL gerada

### Estrutura do Projeto

```
├── src/                 # Front-end React
├── server/             # Back-end Node.js
│   ├── routes/         # Rotas da API
│   ├── database/       # Configuração SQLite
│   └── scripts/        # Scripts de inicialização
├── dist/               # Build do front-end
└── railway.toml        # Configuração Railway
```

### Funcionalidades

- ✅ **Multi-usuário** - Sistema de aprovação de acesso
- ✅ **PDV Completo** - Frente de caixa com scanner
- ✅ **Gestão de Estoque** - Controle automático
- ✅ **Relatórios** - Análises financeiras
- ✅ **NFCe** - Emissão de cupons fiscais
- ✅ **Responsivo** - Funciona em qualquer dispositivo

### Acesso ao Sistema

1. **Super Admin**: Senha `SuperAdmin2024!`
2. **Solicitar Acesso**: Formulário na página inicial
3. **Login**: Email + usuário/senha configurados

### Tecnologias

- **Front-end**: React + TypeScript + Tailwind CSS
- **Back-end**: Node.js + Express + SQLite
- **Deploy**: Railway + Nixpacks
- **Database**: SQLite (persistente)

### Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@vitana.com
- 📱 WhatsApp: (11) 99999-9999

---

Sistema desenvolvido para gestão completa de estabelecimentos comerciais.