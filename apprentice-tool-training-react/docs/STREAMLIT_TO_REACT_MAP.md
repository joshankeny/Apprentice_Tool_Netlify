# Streamlit → React / Supabase Translation Map

| Streamlit / Snowflake | New application |
|---|---|
| `st.session_state` training state | React state + short-lived database question state |
| Snowflake `TOOLS` | `public.tools` |
| Snowflake `TOOL_FAMILIES` | `public.tool_families` |
| Snowflake `SCENARIOS` | `public.scenarios` |
| Snowflake `SCENARIO_TOOLS` | `public.scenario_tools` |
| Snowflake `LEARNERS` | `auth.users` + `public.profiles` |
| Snowflake `TRAINING_SESSIONS` | `public.training_sessions` |
| Snowflake `ATTEMPTS` | `public.attempts` |
| Snowflake stage `ASSETS` | Supabase Storage `tool-images` |
| `st.user.user_name` | Supabase Auth UUID |
| Components v2 | Native React components |
| Python adaptive logic | TypeScript server logic |
| Python question generator | Next.js Route Handler |

## Identity

The new application uses the immutable Supabase Auth UUID as the user key. Display names and login names can change without breaking training history.

## Images

Old: Snowflake stage → bytes → base64 → Streamlit.

New: Admin upload → Supabase Storage → `image_path` in `tools` → browser image URL.

## Answer validation

React does not receive the correct answer before submission. The server stores short-lived `quiz_questions` records and validates submissions server-side.
