"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm(){
 const router=useRouter(); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 async function signIn(event:FormEvent){event.preventDefault();setBusy(true);setMessage("");const supabase=createClient();const {error}=await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error){setMessage(error.message);return;}router.push("/learn");router.refresh();}
 return <form onSubmit={signIn} className="grid"><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{message&&<div className="warning">{message}</div>}<button className="button" disabled={busy}>{busy?"Signing in...":"Sign in"}</button></form>
}
