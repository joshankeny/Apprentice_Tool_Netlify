import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
const Payload=z.object({question_id:z.string().uuid(),selected_tool_id:z.string().uuid()});
export async function POST(request:NextRequest){
 const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub as string|undefined;if(!userId)return NextResponse.json({error:"Unauthorized"},{status:401});
 const parsed=Payload.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid request."},{status:400});const {question_id,selected_tool_id}=parsed.data;
 const {data:question,error}=await supabase.from("quiz_questions").select("id,correct_tool_id,option_tool_ids,answered_at,expires_at").eq("id",question_id).eq("user_id",userId).single();
 if(error||!question)return NextResponse.json({error:"Question not found."},{status:404});if(question.answered_at)return NextResponse.json({error:"Question has already been answered."},{status:409});if(new Date(question.expires_at).getTime()<Date.now())return NextResponse.json({error:"Question expired."},{status:410});
 const allowedOptions=question.option_tool_ids as string[];if(!allowedOptions.includes(selected_tool_id))return NextResponse.json({error:"Selected tool is not a valid option."},{status:400});
 const isCorrect=selected_tool_id===question.correct_tool_id;
 const {error:attemptError}=await supabase.from("attempts").insert({user_id:userId,mode:"QUIZ",tool_id:question.correct_tool_id,question_type:"family_image",selected_answer:selected_tool_id,correct_answer:question.correct_tool_id,is_correct:isCorrect});
 if(attemptError)return NextResponse.json({error:attemptError.message},{status:500});await supabase.from("quiz_questions").update({answered_at:new Date().toISOString()}).eq("id",question_id).eq("user_id",userId);
 return NextResponse.json({correct:isCorrect,correct_tool_id:question.correct_tool_id});
}
