const COMUNS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'senha123', 'senha1234', 'qwerty123',
  'abc12345', 'iloveyou1', '11111111', '00000000', 'admin123', 'admin1234', 'brasil123', 'mudar123',
  'senha@123', 'qwertyuiop', '12341234', 'abcd1234', 'a1b2c3d4', 'lumen123', 'livraria1', 'catolico1',
]);

/** Política de senha (Etapa 4, seção 8.1): mínimo de 8 caracteres e bloqueio de senhas comuns. */
export function validarSenha(senha: string, email?: string): string[] {
  const erros: string[] = [];
  if (senha.length < 8) erros.push('A senha deve ter pelo menos 8 caracteres.');
  if (senha.length > 128) erros.push('A senha deve ter no máximo 128 caracteres.');
  if (!/[A-Za-zÀ-ÿ]/.test(senha)) erros.push('A senha deve conter ao menos uma letra.');
  if (!/\d/.test(senha)) erros.push('A senha deve conter ao menos um número.');
  if (COMUNS.has(senha.toLowerCase())) erros.push('Essa senha é muito comum. Escolha outra.');
  if (email) {
    const local = email.split('@')[0]?.toLowerCase();
    if (local && local.length >= 4 && senha.toLowerCase().includes(local)) {
      erros.push('A senha não deve conter o seu e-mail.');
    }
  }
  return erros;
}
