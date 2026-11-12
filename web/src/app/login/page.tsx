'use client'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { supabase } from '../../lib/supabaseBrowser'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(ev: FormEvent) {
    ev.preventDefault()
    setErro('')
    setEntrando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEntrando(false)
    if (error) return setErro('E-mail ou senha inválidos.')
    router.replace('/')
  }

  return (
    <form className="login" onSubmit={entrar}>
      <h2>Entrar</h2>
      <p className="lead muted">Acompanhe suas remessas.</p>
      <input className="campo" type="email" placeholder="E-mail" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="campo" type="password" placeholder="Senha" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
      {erro && <p className="erro">{erro}</p>}
      <button className="btn" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
    </form>
  )
}
