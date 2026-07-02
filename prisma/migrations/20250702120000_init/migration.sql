-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('CALENDAR_IMPORT', 'MANUAL');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('MANUAL', 'CALENDAR');

-- CreateEnum
CREATE TYPE "CronJobType" AS ENUM ('RECONCILE_CALENDAR', 'RENEW_CALENDAR_SUBSCRIPTIONS', 'PROCESS_INVOICE_SEQUENCES', 'PROCESS_SEQUENCES', 'PROCESS_APPOINTMENT_REMINDERS', 'PROCESS_REVIEW_REQUESTS');

-- CreateEnum
CREATE TYPE "CronJobStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "MessageProvider" AS ENUM ('GOOGLE', 'OUTLOOK', 'RESEND', 'MAILGUN');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "MessagePurpose" AS ENUM ('INVOICE', 'REVIEW', 'REMINDER', 'SEQUENCE', 'MANUAL');

-- CreateEnum
CREATE TYPE "SequenceType" AS ENUM ('INVOICE', 'REVIEW');

-- CreateEnum
CREATE TYPE "SequenceDelayUnit" AS ENUM ('MINUTES', 'HOURS', 'DAYS');

-- CreateEnum
CREATE TYPE "SequenceEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ActivityLogType" AS ENUM ('CRONJOB', 'EMAIL', 'SEQUENCE');

-- CreateEnum
CREATE TYPE "ActivityLogSubType" AS ENUM ('SEQUENCE', 'INVOICE', 'CALENDAR', 'REVIEW', 'APPOINTMENT');

-- CreateEnum
CREATE TYPE "ActivityLogLevel" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "ReminderOffsetUnit" AS ENUM ('MINUTES', 'HOURS', 'DAYS');

-- CreateEnum
CREATE TYPE "WebsiteTicketStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'NEEDS_INFO', 'DONE', 'REJECTED');

-- CreateEnum
CREATE TYPE "WebsiteTicketType" AS ENUM ('UI_CHANGE', 'BUG', 'CONTENT', 'SEO', 'OTHER');

-- CreateEnum
CREATE TYPE "WebsiteTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'EMAIL', 'PHONE', 'TEXTAREA', 'NUMBER');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('QUEUED', 'REQUESTED', 'RECEIVED', 'DECLINED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'BUSINESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_otps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_configs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "resend_domain" TEXT,
    "resend_from_email" TEXT,
    "onboarding_step" INTEGER NOT NULL DEFAULT 1,
    "onboarding_completed_at" TIMESTAMP(3),
    "contact_person" TEXT,
    "business_email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "city" TEXT,
    "tax_id" TEXT,
    "billing_address" TEXT,
    "logo_url" TEXT,
    "domain" TEXT,
    "hosting_access" TEXT,
    "has_website" BOOLEAN NOT NULL DEFAULT false,
    "has_google_analytics" BOOLEAN NOT NULL DEFAULT false,
    "has_search_console" BOOLEAN NOT NULL DEFAULT false,
    "google_review_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_tickets" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "type" "WebsiteTicketType" NOT NULL DEFAULT 'UI_CHANGE',
    "priority" "WebsiteTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "WebsiteTicketStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "admin_note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "provider" "CalendarProvider",
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "account_email" TEXT,
    "account_id" TEXT,
    "calendar_id" TEXT DEFAULT 'primary',
    "connected_at" TIMESTAMP(3),
    "sync_token" TEXT,
    "delta_link" TEXT,
    "initial_sync_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "webhook_channel_id" TEXT,
    "webhook_resource_id" TEXT,
    "webhook_expires_at" TIMESTAMP(3),
    "graph_subscription_id" TEXT,
    "graph_subscription_expires_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "company_name" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "city" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "CustomerSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "title" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meeting_url" TEXT,
    "notes" TEXT,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "reminders_enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "BookingSource" NOT NULL DEFAULT 'CALENDAR_IMPORT',
    "external_event_id" TEXT,
    "external_provider" "CalendarProvider",
    "skip_automation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminder_configs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT NOT NULL DEFAULT 'Reminder: {{appointmentTitle}} with {{businessName}}',
    "body_text" TEXT NOT NULL DEFAULT 'Hello {{customerName}},

This is a reminder for your appointment with {{businessName}}.

Appointment: {{appointmentTitle}}
Date: {{appointmentDate}}
Time: {{appointmentTime}}

{{meetingUrl}}

Thank you.',
    "body_html" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_reminder_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminder_offsets" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "unit" "ReminderOffsetUnit" NOT NULL DEFAULT 'HOURS',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_reminder_offsets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminder_deliveries" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "offset_id" TEXT NOT NULL,
    "message_id" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reminder_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'QUEUED',
    "rating" INTEGER,
    "content" TEXT,
    "requested_at" TIMESTAMP(3),
    "request_reason" TEXT,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "pending_subject" TEXT,
    "pending_body_html" TEXT,
    "responded_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_templates" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "default_title" TEXT,
    "default_notes" TEXT,
    "due_days" INTEGER NOT NULL DEFAULT 30,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 8.1,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_template_services" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_unit_price" DECIMAL(12,2),
    "default_quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_template_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "template_id" TEXT,
    "number" TEXT NOT NULL,
    "title" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "vat_rate" DECIMAL(5,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vat_amount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "notes" TEXT,
    "sent_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_templates" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "type" "SequenceType" NOT NULL DEFAULT 'INVOICE',
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auto_start" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_steps" (
    "id" TEXT NOT NULL,
    "sequence_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "delay_amount" INTEGER NOT NULL DEFAULT 0,
    "delay_unit" "SequenceDelayUnit" NOT NULL DEFAULT 'HOURS',
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "body_html" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_enrollments" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "sequence_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "review_id" TEXT,
    "status" "SequenceEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_step_index" INTEGER NOT NULL DEFAULT 0,
    "next_run_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT,
    "type" "ActivityLogType" NOT NULL,
    "sub_type" "ActivityLogSubType",
    "level" "ActivityLogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "invoice_id" TEXT,
    "review_id" TEXT,
    "customer_id" TEXT,
    "message_id" TEXT,
    "sequence_id" TEXT,
    "sequence_enrollment_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inboxes" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "inbox_id" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL DEFAULT 'EMAIL',
    "provider" "MessageProvider" NOT NULL,
    "purpose" "MessagePurpose" NOT NULL DEFAULT 'MANUAL',
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_text" TEXT,
    "body_html" TEXT,
    "customer_id" TEXT,
    "invoice_id" TEXT,
    "external_id" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "template_service_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_jobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CronJobType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "interval_seconds" INTEGER NOT NULL,
    "next_run_at" TIMESTAMP(3),
    "last_run_at" TIMESTAMP(3),
    "last_status" "CronJobStatus",
    "last_result" JSONB,
    "last_error" TEXT,
    "is_running" BOOLEAN NOT NULL DEFAULT false,
    "run_started_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cron_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "webhook_token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "password_reset_otps_user_id_created_at_idx" ON "password_reset_otps"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_owner_id_idx" ON "businesses"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_configs_business_id_key" ON "business_configs"("business_id");

-- CreateIndex
CREATE INDEX "website_tickets_business_id_status_createdAt_idx" ON "website_tickets"("business_id", "status", "createdAt");

-- CreateIndex
CREATE INDEX "website_ticket_attachments_ticket_id_idx" ON "website_ticket_attachments"("ticket_id");

-- CreateIndex
CREATE INDEX "website_ticket_attachments_business_id_idx" ON "website_ticket_attachments"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_business_id_key" ON "calendar_connections"("business_id");

-- CreateIndex
CREATE INDEX "customers_business_id_idx" ON "customers"("business_id");

-- CreateIndex
CREATE INDEX "customers_business_id_status_idx" ON "customers"("business_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_business_id_email_key" ON "customers"("business_id", "email");

-- CreateIndex
CREATE INDEX "bookings_business_id_starts_at_idx" ON "bookings"("business_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_business_id_external_provider_external_event_id_key" ON "bookings"("business_id", "external_provider", "external_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_reminder_configs_business_id_key" ON "appointment_reminder_configs"("business_id");

-- CreateIndex
CREATE INDEX "appointment_reminder_offsets_config_id_sort_order_idx" ON "appointment_reminder_offsets"("config_id", "sort_order");

-- CreateIndex
CREATE INDEX "appointment_reminder_deliveries_business_id_sent_at_idx" ON "appointment_reminder_deliveries"("business_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_reminder_deliveries_booking_id_offset_id_key" ON "appointment_reminder_deliveries"("booking_id", "offset_id");

-- CreateIndex
CREATE INDEX "reviews_business_id_status_createdAt_idx" ON "reviews"("business_id", "status", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_customer_id_idx" ON "reviews"("customer_id");

-- CreateIndex
CREATE INDEX "invoice_templates_business_id_idx" ON "invoice_templates"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_templates_business_id_name_key" ON "invoice_templates"("business_id", "name");

-- CreateIndex
CREATE INDEX "invoice_template_services_template_id_sort_order_idx" ON "invoice_template_services"("template_id", "sort_order");

-- CreateIndex
CREATE INDEX "invoices_business_id_status_idx" ON "invoices"("business_id", "status");

-- CreateIndex
CREATE INDEX "invoices_business_id_issue_date_idx" ON "invoices"("business_id", "issue_date");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_business_id_number_key" ON "invoices"("business_id", "number");

-- CreateIndex
CREATE INDEX "sequence_templates_business_id_type_is_active_idx" ON "sequence_templates"("business_id", "type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_templates_business_id_name_key" ON "sequence_templates"("business_id", "name");

-- CreateIndex
CREATE INDEX "sequence_steps_sequence_id_sort_order_idx" ON "sequence_steps"("sequence_id", "sort_order");

-- CreateIndex
CREATE INDEX "sequence_enrollments_business_id_status_next_run_at_idx" ON "sequence_enrollments"("business_id", "status", "next_run_at");

-- CreateIndex
CREATE INDEX "sequence_enrollments_sequence_id_idx" ON "sequence_enrollments"("sequence_id");

-- CreateIndex
CREATE INDEX "sequence_enrollments_review_id_idx" ON "sequence_enrollments"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_enrollments_invoice_id_key" ON "sequence_enrollments"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_enrollments_review_id_key" ON "sequence_enrollments"("review_id");

-- CreateIndex
CREATE INDEX "activity_logs_business_id_created_at_idx" ON "activity_logs"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_type_sub_type_created_at_idx" ON "activity_logs"("type", "sub_type", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_sequence_id_idx" ON "activity_logs"("sequence_id");

-- CreateIndex
CREATE INDEX "activity_logs_sequence_enrollment_id_idx" ON "activity_logs"("sequence_enrollment_id");

-- CreateIndex
CREATE INDEX "activity_logs_invoice_id_idx" ON "activity_logs"("invoice_id");

-- CreateIndex
CREATE INDEX "activity_logs_review_id_idx" ON "activity_logs"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "inboxes_business_id_key" ON "inboxes"("business_id");

-- CreateIndex
CREATE INDEX "messages_inbox_id_createdAt_idx" ON "messages"("inbox_id", "createdAt");

-- CreateIndex
CREATE INDEX "messages_invoice_id_idx" ON "messages"("invoice_id");

-- CreateIndex
CREATE INDEX "messages_customer_id_idx" ON "messages"("customer_id");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_sort_order_idx" ON "invoice_line_items"("invoice_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "cron_jobs_type_key" ON "cron_jobs"("type");

-- CreateIndex
CREATE INDEX "cron_jobs_enabled_next_run_at_idx" ON "cron_jobs"("enabled", "next_run_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_business_id_key" ON "subscriptions"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "forms_webhook_token_key" ON "forms"("webhook_token");

-- CreateIndex
CREATE INDEX "forms_business_id_idx" ON "forms"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "forms_business_id_name_key" ON "forms"("business_id", "name");

-- CreateIndex
CREATE INDEX "form_fields_form_id_sort_order_idx" ON "form_fields"("form_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_form_id_key_key" ON "form_fields"("form_id", "key");

-- CreateIndex
CREATE INDEX "enquiries_business_id_createdAt_idx" ON "enquiries"("business_id", "createdAt");

-- CreateIndex
CREATE INDEX "enquiries_business_id_status_idx" ON "enquiries"("business_id", "status");

-- CreateIndex
CREATE INDEX "enquiries_form_id_createdAt_idx" ON "enquiries"("form_id", "createdAt");

-- CreateIndex
CREATE INDEX "enquiries_customer_id_idx" ON "enquiries"("customer_id");

-- AddForeignKey
ALTER TABLE "password_reset_otps" ADD CONSTRAINT "password_reset_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_configs" ADD CONSTRAINT "business_configs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_tickets" ADD CONSTRAINT "website_tickets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_ticket_attachments" ADD CONSTRAINT "website_ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "website_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminder_configs" ADD CONSTRAINT "appointment_reminder_configs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminder_offsets" ADD CONSTRAINT "appointment_reminder_offsets_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "appointment_reminder_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminder_deliveries" ADD CONSTRAINT "appointment_reminder_deliveries_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminder_deliveries" ADD CONSTRAINT "appointment_reminder_deliveries_offset_id_fkey" FOREIGN KEY ("offset_id") REFERENCES "appointment_reminder_offsets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_templates" ADD CONSTRAINT "invoice_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_template_services" ADD CONSTRAINT "invoice_template_services_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "invoice_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "invoice_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_templates" ADD CONSTRAINT "sequence_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "sequence_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "sequence_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "inboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_template_service_id_fkey" FOREIGN KEY ("template_service_id") REFERENCES "invoice_template_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
