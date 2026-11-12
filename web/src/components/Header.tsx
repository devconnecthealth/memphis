'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseBrowser'

export default function Header() {
  const router = useRouter()
  const [logado, setLogado] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLogado(!!data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setLogado(!!s))
    return () => data.subscription.unsubscribe()
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <>
      <header className="global-nav">
        <Link href="/" className="marca">Memphis</Link>
        {logado && <button className="btn-dark" onClick={sair}>Sair</button>}
      </header>
      <div className="sub-nav"><span className="sub-titulo">Remessas</span></div>
    </>
  )
}
