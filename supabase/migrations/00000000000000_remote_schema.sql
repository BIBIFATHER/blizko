


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."matching_outcome_type" AS ENUM (
    'hired',
    'rejected',
    'ghosted'
);


ALTER TYPE "public"."matching_outcome_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_matching_outcomes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_matching_outcomes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "text" NOT NULL,
    "event" "text" NOT NULL,
    "properties" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "url" "text",
    "session_id" "text",
    "user_id" "text",
    "occurred_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_confirmations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "type" "text" DEFAULT 't_24h'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "due_at" timestamp with time zone,
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "booking_confirmations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'missed'::"text"])))
);


ALTER TABLE "public"."booking_confirmations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid",
    "nanny_id" "uuid",
    "request_id" "text",
    "date" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "amount" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid",
    "sender_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_participants" (
    "thread_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "last_read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_participants_role_check" CHECK (("role" = ANY (ARRAY['family'::"text", 'support'::"text", 'nanny'::"text"])))
);


ALTER TABLE "public"."chat_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "family_id" "uuid" NOT NULL,
    "nanny_id" "uuid",
    "match_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_threads_type_check" CHECK (("type" = ANY (ARRAY['support'::"text", 'match'::"text"])))
);


ALTER TABLE "public"."chat_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matching_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "insight_text" "text" NOT NULL,
    "segment" "text" DEFAULT 'all'::"text",
    "correlation" double precision,
    "sample_count" integer DEFAULT 0,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."matching_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matching_outcomes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "nanny_id" "uuid" NOT NULL,
    "outcome" "public"."matching_outcome_type",
    "feedback_text" "text",
    "score_at_match" double precision,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_position" integer
);


ALTER TABLE "public"."matching_outcomes" OWNER TO "postgres";


COMMENT ON TABLE "public"."matching_outcomes" IS 'RLHF feedback: outcome of parent-nanny matching for model training';



CREATE TABLE IF NOT EXISTS "public"."matching_weights" (
    "factor" "text" NOT NULL,
    "weight" double precision NOT NULL,
    "prior_weight" double precision NOT NULL,
    "confidence" double precision DEFAULT 0.5,
    "sample_count" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."matching_weights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nannies" (
    "id" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."nannies" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."nannies_public" WITH ("security_invoker"='false') AS
 SELECT "id",
    "user_id",
    "created_at",
    ((("payload" - 'contact'::"text") - 'documents'::"text") - 'resumeNormalized'::"text") AS "payload"
   FROM "public"."nannies";


ALTER VIEW "public"."nannies_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parents" (
    "id" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."parents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_otps" (
    "phone" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "sent_at" timestamp with time zone NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "send_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."phone_otps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid",
    "referrer_name" "text",
    "referred_email" "text",
    "referred_phone" "text",
    "code" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reward_given" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "referrals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'signed_up'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "ip_address" "text",
    "phone" "text",
    "user_id" "text",
    "tma_user_id" bigint,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_agents" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_agents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid",
    "sender_type" "text" NOT NULL,
    "sender_id" "uuid",
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "support_messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['user'::"text", 'ai_concierge'::"text", 'human_agent'::"text"])))
);


ALTER TABLE "public"."support_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "nanny_id" "uuid",
    "match_id" "uuid",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "sentiment_score" double precision DEFAULT 0.0,
    "summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "support_tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text", 'human_escalated'::"text"])))
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_confirmations"
    ADD CONSTRAINT "booking_confirmations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("thread_id", "user_id");



ALTER TABLE ONLY "public"."chat_threads"
    ADD CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matching_insights"
    ADD CONSTRAINT "matching_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matching_outcomes"
    ADD CONSTRAINT "matching_outcomes_parent_nanny_key" UNIQUE ("parent_id", "nanny_id");



ALTER TABLE ONLY "public"."matching_outcomes"
    ADD CONSTRAINT "matching_outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matching_weights"
    ADD CONSTRAINT "matching_weights_pkey" PRIMARY KEY ("factor");



ALTER TABLE ONLY "public"."nannies"
    ADD CONSTRAINT "nannies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parents"
    ADD CONSTRAINT "parents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_otps"
    ADD CONSTRAINT "phone_otps_pkey" PRIMARY KEY ("phone");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_agents"
    ADD CONSTRAINT "support_agents_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_analytics_events_event" ON "public"."analytics_events" USING "btree" ("event");



CREATE INDEX "idx_analytics_events_occurred_at" ON "public"."analytics_events" USING "btree" ("occurred_at" DESC);



CREATE INDEX "idx_analytics_events_session_id" ON "public"."analytics_events" USING "btree" ("session_id");



CREATE INDEX "idx_audit_created_at" ON "public"."security_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_event_type" ON "public"."security_audit_log" USING "btree" ("event_type");



CREATE INDEX "idx_audit_ip" ON "public"."security_audit_log" USING "btree" ("ip_address");



CREATE INDEX "idx_booking_confirmations_booking" ON "public"."booking_confirmations" USING "btree" ("booking_id");



CREATE INDEX "idx_bookings_nanny" ON "public"."bookings" USING "btree" ("nanny_id");



CREATE INDEX "idx_bookings_parent" ON "public"."bookings" USING "btree" ("parent_id");



CREATE INDEX "idx_chat_messages_thread" ON "public"."chat_messages" USING "btree" ("thread_id");



CREATE INDEX "idx_matching_outcomes_created" ON "public"."matching_outcomes" USING "btree" ("created_at");



CREATE INDEX "idx_matching_outcomes_nanny" ON "public"."matching_outcomes" USING "btree" ("nanny_id");



CREATE INDEX "idx_matching_outcomes_outcome" ON "public"."matching_outcomes" USING "btree" ("outcome");



CREATE INDEX "idx_matching_outcomes_parent" ON "public"."matching_outcomes" USING "btree" ("parent_id");



CREATE UNIQUE INDEX "idx_matching_outcomes_parent_nanny_unique" ON "public"."matching_outcomes" USING "btree" ("parent_id", "nanny_id");



CREATE INDEX "idx_nannies_user" ON "public"."nannies" USING "btree" ("user_id");



CREATE INDEX "idx_parents_status" ON "public"."parents" USING "btree" ((("payload" ->> 'status'::"text")));



CREATE INDEX "idx_parents_user" ON "public"."parents" USING "btree" ("user_id");



CREATE INDEX "idx_referrals_code" ON "public"."referrals" USING "btree" ("code");



CREATE INDEX "idx_referrals_referrer" ON "public"."referrals" USING "btree" ("referrer_id");



CREATE OR REPLACE TRIGGER "nannies_updated_at" BEFORE UPDATE ON "public"."nannies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "parents_updated_at" BEFORE UPDATE ON "public"."parents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_matching_outcomes_updated_at" BEFORE UPDATE ON "public"."matching_outcomes" FOR EACH ROW EXECUTE FUNCTION "public"."update_matching_outcomes_updated_at"();



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."booking_confirmations"
    ADD CONSTRAINT "booking_confirmations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_nanny_id_fkey" FOREIGN KEY ("nanny_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."parents"("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matching_outcomes"
    ADD CONSTRAINT "matching_outcomes_nanny_id_fkey" FOREIGN KEY ("nanny_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matching_outcomes"
    ADD CONSTRAINT "matching_outcomes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



CREATE POLICY "Nannies can view feedback about them" ON "public"."matching_outcomes" FOR SELECT USING (("auth"."uid"() = "nanny_id"));



CREATE POLICY "Parents can insert own feedback" ON "public"."matching_outcomes" FOR INSERT WITH CHECK (("auth"."uid"() = "parent_id"));



CREATE POLICY "Parents can update their own matching outcomes" ON "public"."matching_outcomes" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "parent_id")) WITH CHECK (("auth"."uid"() = "parent_id"));



CREATE POLICY "Parents can view own feedback" ON "public"."matching_outcomes" FOR SELECT USING (("auth"."uid"() = "parent_id"));



ALTER TABLE "public"."admin_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_actions_service_only" ON "public"."admin_actions" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "analytics_events_service_only" ON "public"."analytics_events" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "audit_service_only" ON "public"."security_audit_log" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."booking_confirmations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_participant" ON "public"."bookings" USING ((("auth"."uid"() = "parent_id") OR ("auth"."uid"() = "nanny_id")));



ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_messages_insert_participant" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (("sender_id" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM "public"."chat_participants" "p"
  WHERE (("p"."thread_id" = "chat_messages"."thread_id") AND ("p"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."support_agents" "sa"
     JOIN "public"."chat_threads" "t" ON (("t"."id" = "chat_messages"."thread_id")))
  WHERE (("sa"."user_id" = "auth"."uid"()) AND ("t"."type" = 'support'::"text"))))))));



CREATE POLICY "chat_messages_select_participant" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."chat_participants" "p"
  WHERE (("p"."thread_id" = "chat_messages"."thread_id") AND ("p"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."support_agents" "sa"
     JOIN "public"."chat_threads" "t" ON (("t"."id" = "chat_messages"."thread_id")))
  WHERE (("sa"."user_id" = "auth"."uid"()) AND ("t"."type" = 'support'::"text"))))));



ALTER TABLE "public"."chat_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_threads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "confirmations_participant" ON "public"."booking_confirmations" USING (("booking_id" IN ( SELECT "bookings"."id"
   FROM "public"."bookings"
  WHERE (("auth"."uid"() = "bookings"."parent_id") OR ("auth"."uid"() = "bookings"."nanny_id")))));



CREATE POLICY "deny all" ON "public"."phone_otps" USING (false) WITH CHECK (false);



CREATE POLICY "insights_client_read" ON "public"."matching_insights" FOR SELECT TO "anon", "authenticated" USING (("active" = true));



CREATE POLICY "insights_service_only" ON "public"."matching_insights" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."matching_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matching_outcomes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matching_weights" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert" ON "public"."support_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."support_tickets" "st"
  WHERE (("st"."id" = "support_messages"."ticket_id") AND ("st"."family_id" = "auth"."uid"())))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "messages_own_ticket" ON "public"."support_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."support_tickets" "st"
  WHERE (("st"."id" = "support_messages"."ticket_id") AND ("st"."family_id" = "auth"."uid"())))) OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."nannies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nannies_admin_write" ON "public"."nannies" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "nannies_delete_own" ON "public"."nannies" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "nannies_insert_own" ON "public"."nannies" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "nannies_read_own" ON "public"."nannies" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "nannies_select_own" ON "public"."nannies" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "nannies_update_own" ON "public"."nannies" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "otps_service_only" ON "public"."phone_otps" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "outcomes_service_only" ON "public"."matching_outcomes" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."parents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parents_delete_own" ON "public"."parents" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "parents_insert_own" ON "public"."parents" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "parents_own_delete" ON "public"."parents" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "parents_own_read" ON "public"."parents" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "parents_own_update" ON "public"."parents" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "parents_own_write" ON "public"."parents" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "parents_select_own" ON "public"."parents" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "parents_update_own" ON "public"."parents" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "participants_insert_v2" ON "public"."chat_participants" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "participants_select_v2" ON "public"."chat_participants" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."phone_otps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "referrals_owner" ON "public"."referrals" USING (("auth"."uid"() = "referrer_id"));



ALTER TABLE "public"."security_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_agents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_agents_select" ON "public"."support_agents" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."support_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "threads_insert_v2" ON "public"."chat_threads" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "family_id"));



CREATE POLICY "threads_select_v2" ON "public"."chat_threads" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "family_id"));



CREATE POLICY "tickets_admin_delete" ON "public"."support_tickets" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "tickets_admin_modify" ON "public"."support_tickets" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "tickets_insert_own" ON "public"."support_tickets" FOR INSERT WITH CHECK ((("auth"."uid"() = "family_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "tickets_own_or_admin" ON "public"."support_tickets" FOR SELECT USING ((("auth"."uid"() = "family_id") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "weights_client_read" ON "public"."matching_weights" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "weights_service_only" ON "public"."matching_weights" USING (("auth"."role"() = 'service_role'::"text"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_matching_outcomes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_matching_outcomes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_matching_outcomes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."admin_actions" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."booking_confirmations" TO "anon";
GRANT ALL ON TABLE "public"."booking_confirmations" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_confirmations" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_participants" TO "anon";
GRANT ALL ON TABLE "public"."chat_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_participants" TO "service_role";



GRANT ALL ON TABLE "public"."chat_threads" TO "anon";
GRANT ALL ON TABLE "public"."chat_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_threads" TO "service_role";



GRANT ALL ON TABLE "public"."matching_insights" TO "anon";
GRANT ALL ON TABLE "public"."matching_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."matching_insights" TO "service_role";



GRANT ALL ON TABLE "public"."matching_outcomes" TO "anon";
GRANT ALL ON TABLE "public"."matching_outcomes" TO "authenticated";
GRANT ALL ON TABLE "public"."matching_outcomes" TO "service_role";



GRANT ALL ON TABLE "public"."matching_weights" TO "anon";
GRANT ALL ON TABLE "public"."matching_weights" TO "authenticated";
GRANT ALL ON TABLE "public"."matching_weights" TO "service_role";



GRANT ALL ON TABLE "public"."nannies" TO "anon";
GRANT ALL ON TABLE "public"."nannies" TO "authenticated";
GRANT ALL ON TABLE "public"."nannies" TO "service_role";



GRANT ALL ON TABLE "public"."nannies_public" TO "anon";
GRANT ALL ON TABLE "public"."nannies_public" TO "authenticated";
GRANT ALL ON TABLE "public"."nannies_public" TO "service_role";



GRANT ALL ON TABLE "public"."parents" TO "anon";
GRANT ALL ON TABLE "public"."parents" TO "authenticated";
GRANT ALL ON TABLE "public"."parents" TO "service_role";



GRANT ALL ON TABLE "public"."phone_otps" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."security_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."support_agents" TO "service_role";



GRANT ALL ON TABLE "public"."support_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_messages" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
