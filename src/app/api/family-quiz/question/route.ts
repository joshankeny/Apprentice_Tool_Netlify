import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyLearningStatus, selectionWeight } from "@/lib/training/rules";
import { weightedPick, sampleWithoutReplacement } from "@/lib/training/random";
import { publicToolImageUrl } from "@/lib/storage";

type ToolRow = { id:string; formal_name:string; family_id:string; image_path:string; is_commonly_missed:boolean; tool_families:{name:string}|null };

export async function GET(){
 const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub as string|undefined;if(!userId)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {data:tools,error:toolError}=await supabase.from("tools").select("id,formal_name,family_id,image_path,is_commonly_missed,tool_families(name)").eq("status","published").not("image_path","is",null);
 if(toolError)return NextResponse.json({error:toolError.message},{status:500});
 const typedTools=(tools??[]) as unknown as ToolRow[];const byFamily=new Map<string,ToolRow[]>();for(const tool of typedTools){if(!tool.family_id||!tool.image_path)continue;const family=byFamily.get(tool.family_id)??[];family.push(tool);byFamily.set(tool.family_id,family)}
 const eligible=typedTools.filter(tool=>(byFamily.get(tool.family_id)?.length??0)>=4);if(!eligible.length)return NextResponse.json({error:"No family has at least four published tools with images."},{status:400});
 const {data:attempts}=await supabase.from("attempts").select("tool_id,is_correct,attempted_at").eq("user_id",userId).order("attempted_at",{ascending:true});
 const stats=new Map<string,{attempts:number;correct:number;latestCorrect:boolean}>();for(const row of attempts??[]){const current=stats.get(row.tool_id)??{attempts:0,correct:0,latestCorrect:false};current.attempts+=1;current.correct+=row.is_correct?1:0;current.latestCorrect=row.is_correct;stats.set(row.tool_id,current)}
 const weighted=eligible.map(tool=>{const s=stats.get(tool.id)??{attempts:0,correct:0,latestCorrect:false};const accuracy=s.attempts?s.correct/s.attempts:0;const status=classifyLearningStatus({attempts:s.attempts,accuracy,mostRecentCorrect:s.latestCorrect});return {tool,weight:selectionWeight(status,tool.is_commonly_missed)}});
 const correct=weightedPick(weighted,item=>item.weight).tool;const familyTools=(byFamily.get(correct.family_id)??[]).filter(tool=>tool.id!==correct.id);const distractors=sampleWithoutReplacement(familyTools,3);const options=sampleWithoutReplacement([correct,...distractors],4);
 const {data:question,error:questionError}=await supabase.from("quiz_questions").insert({user_id:userId,mode:"FAMILY_QUIZ",question_type:"family_image",correct_tool_id:correct.id,option_tool_ids:options.map(tool=>tool.id)}).select("id").single();
 if(questionError||!question)return NextResponse.json({error:questionError?.message??"Could not create question."},{status:500});
 const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL!;
 return NextResponse.json({question_id:question.id,prompt:`Select the ${correct.formal_name}`,family_name:correct.tool_families?.name??"Tool Family",options:options.map(tool=>({tool_id:tool.id,formal_name:tool.formal_name,image_url:publicToolImageUrl(supabaseUrl,tool.image_path)}))});
}
