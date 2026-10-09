
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "actor_id": string | null,"client_id": string,"created_at": string,"data": NonNullable<Json>,"entity_id": string | null,"entity_type": string | null,"event": string,"id": number,"project_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"client_id": string,"created_at"?: string,"data"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type"?: string | null,"event": string,"id"?: never,"project_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"client_id"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type"?: string | null,"event"?: string,"id"?: never,"project_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"app_settings": {
                  Row: {
                    "allowed_mime_types": (string)[],"id": boolean,"max_upload_bytes": number,"reminder_after_days": number,"reminder_interval_days": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allowed_mime_types"?: (string)[],"id"?: boolean,"max_upload_bytes"?: number,"reminder_after_days"?: number,"reminder_interval_days"?: number,"updated_at"?: string
                  }
                  Update: {
                    "allowed_mime_types"?: (string)[],"id"?: boolean,"max_upload_bytes"?: number,"reminder_after_days"?: number,"reminder_interval_days"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"approval_rounds": {
                  Row: {
                    "id": string,"link": string | null,"note": string | null,"opened_at": string,"opened_by": string | null,"round": number,"step_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"link"?: string | null,"note"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"round": number,"step_id": string
                  }
                  Update: {
                    "id"?: string,"link"?: string | null,"note"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"round"?: number,"step_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_rounds_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "project_steps"
      referencedColumns: ["id"]
    }
                  ]
                },"approvals": {
                  Row: {
                    "comment": string | null,"created_at": string,"decision": Database["public"]['Enums']["approval_decision"],"id": string,"round": number,"round_id": string,"step_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"decision": Database["public"]['Enums']["approval_decision"],"id"?: string,"round": number,"round_id": string,"step_id": string,"user_id": string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"decision"?: Database["public"]['Enums']["approval_decision"],"id"?: string,"round"?: number,"round_id"?: string,"step_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approvals_round_id_fkey"
      columns: ["round_id"]
isOneToOne: true
      referencedRelation: "approval_rounds"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approvals_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "project_steps"
      referencedColumns: ["id"]
    }
                  ]
                },"change_requests": {
                  Row: {
                    "accepted_at": string | null,"billing": Database["public"]['Enums']["change_request_billing"],"client_id": string,"created_at": string,"created_by": string | null,"description": string | null,"done_at": string | null,"estimate_minutes": number | null,"id": string,"project_id": string,"status": Database["public"]['Enums']["change_request_status"],"title": string,"updated_at": string,"urgency": Database["public"]['Enums']["change_request_urgency"]
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"billing"?: Database["public"]['Enums']["change_request_billing"],"client_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"done_at"?: string | null,"estimate_minutes"?: number | null,"id"?: string,"project_id": string,"status"?: Database["public"]['Enums']["change_request_status"],"title": string,"updated_at"?: string,"urgency"?: Database["public"]['Enums']["change_request_urgency"]
                  }
                  Update: {
                    "accepted_at"?: string | null,"billing"?: Database["public"]['Enums']["change_request_billing"],"client_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"done_at"?: string | null,"estimate_minutes"?: number | null,"id"?: string,"project_id"?: string,"status"?: Database["public"]['Enums']["change_request_status"],"title"?: string,"updated_at"?: string,"urgency"?: Database["public"]['Enums']["change_request_urgency"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "change_requests_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "change_requests_project_id_client_id_fkey"
      columns: ["project_id","client_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","client_id"]
    }
                  ]
                },"client_members": {
                  Row: {
                    "client_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_members_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"client_private": {
                  Row: {
                    "client_id": string,"internal_notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"internal_notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string,"internal_notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_private_client_id_fkey"
      columns: ["client_id"]
isOneToOne: true
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "address": string | null,"contact_email": string | null,"contact_phone": string | null,"created_at": string,"id": string,"name": string,"org_number": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"name": string,"org_number"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"org_number"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"comments": {
                  Row: {
                    "author_id": string | null,"body": string,"change_request_id": string | null,"created_at": string,"id": string,"internal": boolean,"project_id": string,"step_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"change_request_id"?: string | null,"created_at"?: string,"id"?: string,"internal"?: boolean,"project_id": string,"step_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"change_request_id"?: string | null,"created_at"?: string,"id"?: string,"internal"?: boolean,"project_id"?: string,"step_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_change_request_id_fkey"
      columns: ["change_request_id"]
isOneToOne: false
      referencedRelation: "change_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "project_steps"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "created_at": string,"document_date": string,"external_url": string | null,"id": string,"project_id": string,"status": Database["public"]['Enums']["document_status"],"step_id": string | null,"storage_path": string | null,"title": string,"type": Database["public"]['Enums']["document_type"],"updated_at": string,"visible_to_client": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_date"?: string,"external_url"?: string | null,"id"?: string,"project_id": string,"status"?: Database["public"]['Enums']["document_status"],"step_id"?: string | null,"storage_path"?: string | null,"title": string,"type": Database["public"]['Enums']["document_type"],"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"document_date"?: string,"external_url"?: string | null,"id"?: string,"project_id"?: string,"status"?: Database["public"]['Enums']["document_status"],"step_id"?: string | null,"storage_path"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["document_type"],"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "project_steps"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "entity_id": string | null,"id": number,"kind": string,"recipient": string,"resend_id": string | null,"sent_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entity_id"?: string | null,"id"?: never,"kind": string,"recipient": string,"resend_id"?: string | null,"sent_at"?: string
                  }
                  Update: {
                    "entity_id"?: string | null,"id"?: never,"kind"?: string,"recipient"?: string,"resend_id"?: string | null,"sent_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"files": {
                  Row: {
                    "change_request_id": string | null,"client_id": string,"created_at": string,"id": string,"mime_type": string,"name": string,"project_id": string,"size_bytes": number,"step_id": string | null,"storage_path": string,"uploaded_by": string | null,"visible_to_client": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "change_request_id"?: string | null,"client_id": string,"created_at"?: string,"id"?: string,"mime_type": string,"name": string,"project_id": string,"size_bytes": number,"step_id"?: string | null,"storage_path": string,"uploaded_by"?: string | null,"visible_to_client"?: boolean
                  }
                  Update: {
                    "change_request_id"?: string | null,"client_id"?: string,"created_at"?: string,"id"?: string,"mime_type"?: string,"name"?: string,"project_id"?: string,"size_bytes"?: number,"step_id"?: string | null,"storage_path"?: string,"uploaded_by"?: string | null,"visible_to_client"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "files_change_request_id_fkey"
      columns: ["change_request_id"]
isOneToOne: false
      referencedRelation: "change_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_project_id_client_id_fkey"
      columns: ["project_id","client_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","client_id"]
    },{
      foreignKeyName: "files_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "project_steps"
      referencedColumns: ["id"]
    }
                  ]
                },"form_definitions": {
                  Row: {
                    "binding": string | null,"created_at": string,"description": string | null,"id": string,"key": string,"schema": NonNullable<Json>,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "binding"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"key": string,"schema": NonNullable<Json>,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "binding"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"key"?: string,"schema"?: NonNullable<Json>,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"form_responses": {
                  Row: {
                    "answers": NonNullable<Json>,"created_at": string,"definition_snapshot": Json | null,"id": string,"status": Database["public"]['Enums']["form_response_status"],"step_id": string,"submitted_at": string | null,"submitted_by": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"created_at"?: string,"definition_snapshot"?: Json | null,"id"?: string,"status"?: Database["public"]['Enums']["form_response_status"],"step_id": string,"submitted_at"?: string | null,"submitted_by"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"created_at"?: string,"definition_snapshot"?: Json | null,"id"?: string,"status"?: Database["public"]['Enums']["form_response_status"],"step_id"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "form_responses_step_id_fkey"
      columns: ["step_id"]
isOneToOne: true
      referencedRelation: "project_steps"
      referencedColumns: ["id"]
    }
                  ]
                },"handover_pages": {
                  Row: {
                    "created_at": string,"id": string,"project_id": string,"public_enabled": boolean,"public_token": string,"published_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"project_id": string,"public_enabled"?: boolean,"public_token"?: string,"published_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"project_id"?: string,"public_enabled"?: boolean,"public_token"?: string,"published_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "handover_pages_project_id_fkey"
      columns: ["project_id"]
isOneToOne: true
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"handover_sections": {
                  Row: {
                    "content": NonNullable<Json>,"created_at": string,"id": string,"kind": Database["public"]['Enums']["handover_section_kind"],"page_id": string,"position": number,"title": string,"updated_at": string,"visible": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["handover_section_kind"],"page_id": string,"position": number,"title": string,"updated_at"?: string,"visible"?: boolean
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["handover_section_kind"],"page_id"?: string,"position"?: number,"title"?: string,"updated_at"?: string,"visible"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "handover_sections_page_id_fkey"
      columns: ["page_id"]
isOneToOne: false
      referencedRelation: "handover_pages"
      referencedColumns: ["id"]
    }
                  ]
                },"maintenance_agreements": {
                  Row: {
                    "client_id": string,"created_at": string,"end_date": string | null,"id": string,"minutes_override": number | null,"plan_id": string,"price_override_ore": number | null,"project_id": string,"start_date": string,"status": Database["public"]['Enums']["agreement_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"end_date"?: string | null,"id"?: string,"minutes_override"?: number | null,"plan_id": string,"price_override_ore"?: number | null,"project_id": string,"start_date": string,"status"?: Database["public"]['Enums']["agreement_status"],"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"end_date"?: string | null,"id"?: string,"minutes_override"?: number | null,"plan_id"?: string,"price_override_ore"?: number | null,"project_id"?: string,"start_date"?: string,"status"?: Database["public"]['Enums']["agreement_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "maintenance_agreements_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_agreements_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "maintenance_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_agreements_project_id_client_id_fkey"
      columns: ["project_id","client_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","client_id"]
    }
                  ]
                },"maintenance_log": {
                  Row: {
                    "client_id": string,"created_at": string,"created_by": string | null,"description": string | null,"entry_date": string,"id": string,"project_id": string,"title": string,"updated_at": string,"visible_to_client": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"entry_date"?: string,"id"?: string,"project_id": string,"title": string,"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"entry_date"?: string,"id"?: string,"project_id"?: string,"title"?: string,"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "maintenance_log_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_log_project_id_client_id_fkey"
      columns: ["project_id","client_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","client_id"]
    }
                  ]
                },"maintenance_plans": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"included_minutes_per_month": number,"includes": (string)[],"is_active": boolean,"monthly_price_ore": number,"name": string,"notice_period": string | null,"response_time": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"included_minutes_per_month": number,"includes"?: (string)[],"is_active"?: boolean,"monthly_price_ore": number,"name": string,"notice_period"?: string | null,"response_time"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"included_minutes_per_month"?: number,"includes"?: (string)[],"is_active"?: boolean,"monthly_price_ore"?: number,"name"?: string,"notice_period"?: string | null,"response_time"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"process_templates": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"key": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"key": string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"key"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"phone": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"project_phases": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"name": string,"position": number,"project_id": string,"status": Database["public"]['Enums']["phase_status"],"step_mode": Database["public"]['Enums']["step_mode"],"template_phase_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"position": number,"project_id": string,"status"?: Database["public"]['Enums']["phase_status"],"step_mode"?: Database["public"]['Enums']["step_mode"],"template_phase_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"position"?: number,"project_id"?: string,"status"?: Database["public"]['Enums']["phase_status"],"step_mode"?: Database["public"]['Enums']["step_mode"],"template_phase_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_phases_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_phases_template_phase_id_fkey"
      columns: ["template_phase_id"]
isOneToOne: false
      referencedRelation: "template_phases"
      referencedColumns: ["id"]
    }
                  ]
                },"project_steps": {
                  Row: {
                    "activated_at": string | null,"completed_at": string | null,"completed_by": string | null,"config": NonNullable<Json>,"created_at": string,"description": string | null,"due_date": string | null,"form_definition_id": string | null,"id": string,"max_revision_rounds": number | null,"owner": Database["public"]['Enums']["step_owner"],"phase_id": string,"position": number,"project_id": string,"status": Database["public"]['Enums']["step_status"],"template_step_id": string | null,"title": string,"type": Database["public"]['Enums']["step_type"],"updated_at": string,"visible_to_client": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"config"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"due_date"?: string | null,"form_definition_id"?: string | null,"id"?: string,"max_revision_rounds"?: number | null,"owner": Database["public"]['Enums']["step_owner"],"phase_id": string,"position": number,"project_id": string,"status"?: Database["public"]['Enums']["step_status"],"template_step_id"?: string | null,"title": string,"type": Database["public"]['Enums']["step_type"],"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Update: {
                    "activated_at"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"config"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"due_date"?: string | null,"form_definition_id"?: string | null,"id"?: string,"max_revision_rounds"?: number | null,"owner"?: Database["public"]['Enums']["step_owner"],"phase_id"?: string,"position"?: number,"project_id"?: string,"status"?: Database["public"]['Enums']["step_status"],"template_step_id"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["step_type"],"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_steps_form_definition_id_fkey"
      columns: ["form_definition_id"]
isOneToOne: false
      referencedRelation: "form_definitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_steps_phase_id_project_id_fkey"
      columns: ["phase_id","project_id"]
isOneToOne: false
      referencedRelation: "project_phases"
      referencedColumns: ["id","project_id"]
    },{
      foreignKeyName: "project_steps_template_step_id_fkey"
      columns: ["template_step_id"]
isOneToOne: false
      referencedRelation: "template_steps"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "client_id": string,"cms_url": string | null,"created_at": string,"id": string,"launched_at": string | null,"live_url": string | null,"name": string,"reminders_enabled": boolean,"staging_url": string | null,"start_date": string | null,"status": Database["public"]['Enums']["project_status"],"target_launch_date": string | null,"template_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"cms_url"?: string | null,"created_at"?: string,"id"?: string,"launched_at"?: string | null,"live_url"?: string | null,"name": string,"reminders_enabled"?: boolean,"staging_url"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"target_launch_date"?: string | null,"template_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string,"cms_url"?: string | null,"created_at"?: string,"id"?: string,"launched_at"?: string | null,"live_url"?: string | null,"name"?: string,"reminders_enabled"?: boolean,"staging_url"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"target_launch_date"?: string | null,"template_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "process_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"site_details": {
                  Row: {
                    "access_notes": string | null,"analytics_notes": string | null,"created_at": string,"dns_provider": string | null,"domain_name": string | null,"domain_owner": Database["public"]['Enums']["party"] | null,"domain_renewal_date": string | null,"email_provider": string | null,"google_business_profile_url": string | null,"hosting_owner": Database["public"]['Enums']["party"] | null,"hosting_provider": string | null,"hosting_renewal_date": string | null,"project_id": string,"registrar": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "access_notes"?: string | null,"analytics_notes"?: string | null,"created_at"?: string,"dns_provider"?: string | null,"domain_name"?: string | null,"domain_owner"?: Database["public"]['Enums']["party"] | null,"domain_renewal_date"?: string | null,"email_provider"?: string | null,"google_business_profile_url"?: string | null,"hosting_owner"?: Database["public"]['Enums']["party"] | null,"hosting_provider"?: string | null,"hosting_renewal_date"?: string | null,"project_id": string,"registrar"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "access_notes"?: string | null,"analytics_notes"?: string | null,"created_at"?: string,"dns_provider"?: string | null,"domain_name"?: string | null,"domain_owner"?: Database["public"]['Enums']["party"] | null,"domain_renewal_date"?: string | null,"email_provider"?: string | null,"google_business_profile_url"?: string | null,"hosting_owner"?: Database["public"]['Enums']["party"] | null,"hosting_provider"?: string | null,"hosting_renewal_date"?: string | null,"project_id"?: string,"registrar"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_details_project_id_fkey"
      columns: ["project_id"]
isOneToOne: true
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"template_phases": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"name": string,"position": number,"step_mode": Database["public"]['Enums']["step_mode"],"template_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"position": number,"step_mode"?: Database["public"]['Enums']["step_mode"],"template_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"position"?: number,"step_mode"?: Database["public"]['Enums']["step_mode"],"template_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "template_phases_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "process_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"template_steps": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"description": string | null,"due_offset_days": number | null,"form_definition_id": string | null,"id": string,"max_revision_rounds": number | null,"owner": Database["public"]['Enums']["step_owner"],"phase_id": string,"position": number,"title": string,"type": Database["public"]['Enums']["step_type"],"updated_at": string,"visible_to_client": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"due_offset_days"?: number | null,"form_definition_id"?: string | null,"id"?: string,"max_revision_rounds"?: number | null,"owner": Database["public"]['Enums']["step_owner"],"phase_id": string,"position": number,"title": string,"type": Database["public"]['Enums']["step_type"],"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"due_offset_days"?: number | null,"form_definition_id"?: string | null,"id"?: string,"max_revision_rounds"?: number | null,"owner"?: Database["public"]['Enums']["step_owner"],"phase_id"?: string,"position"?: number,"title"?: string,"type"?: Database["public"]['Enums']["step_type"],"updated_at"?: string,"visible_to_client"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "template_steps_form_definition_id_fkey"
      columns: ["form_definition_id"]
isOneToOne: false
      referencedRelation: "form_definitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "template_steps_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "template_phases"
      referencedColumns: ["id"]
    }
                  ]
                },"time_entries": {
                  Row: {
                    "change_request_id": string | null,"created_at": string,"description": string | null,"entry_date": string,"id": string,"maintenance_log_id": string | null,"minutes": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "change_request_id"?: string | null,"created_at"?: string,"description"?: string | null,"entry_date"?: string,"id"?: string,"maintenance_log_id"?: string | null,"minutes": number,"updated_at"?: string
                  }
                  Update: {
                    "change_request_id"?: string | null,"created_at"?: string,"description"?: string | null,"entry_date"?: string,"id"?: string,"maintenance_log_id"?: string | null,"minutes"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_entries_change_request_id_fkey"
      columns: ["change_request_id"]
isOneToOne: false
      referencedRelation: "change_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "time_entries_maintenance_log_id_fkey"
      columns: ["maintenance_log_id"]
isOneToOne: false
      referencedRelation: "maintenance_log"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_phase":
{ Args: { "p_description"?: string,"p_name": string,"p_project_id": string,"p_step_mode"?: Database["public"]['Enums']["step_mode"] }; Returns: string
                           },
"add_step":
{ Args: { "p_description"?: string,"p_due_date"?: string,"p_form_definition_id"?: string,"p_max_revision_rounds"?: number,"p_owner": Database["public"]['Enums']["step_owner"],"p_phase_id": string,"p_title": string,"p_type": Database["public"]['Enums']["step_type"],"p_visible_to_client"?: boolean }; Returns: string
                           },
"agreement_usage":
{ Args: { "p_agreement_id": string,"p_month"?: string }; Returns: {
              "included_minutes": number,"month": string,"used_minutes": number
            }[]
                           },
"agreements_usage_overview":
{ Args: { "p_month"?: string }; Returns: {
              "agreement_id": string,"client_id": string,"client_name": string,"included_minutes": number,"used_minutes": number
            }[]
                           },
"complete_client_step":
{ Args: { "p_step_id": string }; Returns: undefined
                           },
"complete_step":
{ Args: { "p_skip"?: boolean,"p_step_id": string }; Returns: undefined
                           },
"create_project_from_template":
{ Args: { "p_client_id": string,"p_name": string,"p_start_date"?: string,"p_target_launch_date"?: string,"p_template_id": string }; Returns: string
                           },
"delete_phase":
{ Args: { "p_phase_id": string }; Returns: undefined
                           },
"delete_step":
{ Args: { "p_step_id": string }; Returns: undefined
                           },
"get_public_handover":
{ Args: { "p_token": string }; Returns: Json
                           },
"is_admin_account":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"move_phase":
{ Args: { "p_direction": number,"p_phase_id": string }; Returns: undefined
                           },
"move_step":
{ Args: { "p_direction": number,"p_step_id": string }; Returns: undefined
                           },
"open_approval_round":
{ Args: { "p_link"?: string,"p_note"?: string,"p_step_id": string }; Returns: number
                           },
"register_upload":
{ Args: { "p_mime_type": string,"p_name": string,"p_size_bytes": number,"p_step_id": string,"p_storage_path": string }; Returns: string
                           },
"remove_own_upload":
{ Args: { "p_file_id": string }; Returns: string
                           },
"reopen_step":
{ Args: { "p_step_id": string }; Returns: undefined
                           },
"submit_approval":
{ Args: { "p_comment"?: string,"p_decision": Database["public"]['Enums']["approval_decision"],"p_step_id": string }; Returns: Json
                           },
"submit_form":
{ Args: { "p_answers": Json,"p_step_id": string }; Returns: undefined
                           },
"sync_project":
{ Args: { "p_project_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "agreement_status": "proposed"|"active"|"paused"|"ended","approval_decision": "approved"|"changes_requested","change_request_billing": "included"|"extra"|"quote_needed","change_request_status": "new"|"accepted"|"in_progress"|"waiting_on_client"|"done"|"declined","change_request_urgency": "normal"|"urgent","document_status": "draft"|"sent"|"accepted"|"signed"|"paid"|"void","document_type": "proposal"|"contract"|"invoice"|"other","form_response_status": "draft"|"submitted","handover_section_kind": "logos"|"colours"|"fonts"|"website_guide"|"domain_hosting"|"links_contacts"|"access_notes"|"custom","party": "client"|"studio","phase_status": "pending"|"active"|"done","project_status": "active"|"paused"|"completed"|"archived","step_mode": "sequential"|"parallel","step_owner": "studio"|"client","step_status": "pending"|"active"|"done"|"skipped","step_type": "task"|"upload"|"approval"|"form"|"link"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "agreement_status": ["proposed", "active", "paused", "ended"],"approval_decision": ["approved", "changes_requested"],"change_request_billing": ["included", "extra", "quote_needed"],"change_request_status": ["new", "accepted", "in_progress", "waiting_on_client", "done", "declined"],"change_request_urgency": ["normal", "urgent"],"document_status": ["draft", "sent", "accepted", "signed", "paid", "void"],"document_type": ["proposal", "contract", "invoice", "other"],"form_response_status": ["draft", "submitted"],"handover_section_kind": ["logos", "colours", "fonts", "website_guide", "domain_hosting", "links_contacts", "access_notes", "custom"],"party": ["client", "studio"],"phase_status": ["pending", "active", "done"],"project_status": ["active", "paused", "completed", "archived"],"step_mode": ["sequential", "parallel"],"step_owner": ["studio", "client"],"step_status": ["pending", "active", "done", "skipped"],"step_type": ["task", "upload", "approval", "form", "link"]
          }
        }
} as const
