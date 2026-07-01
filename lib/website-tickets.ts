import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

import {
  WebsiteTicketPriority,
  WebsiteTicketStatus,
  WebsiteTicketType,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { WebsiteTicketWriteInput } from "@/lib/validation/website-ticket";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "website-tickets");

export type WebsiteOverview = {
  domain: string | null;
  hostingAccessConfigured: boolean;
  hasWebsite: boolean;
  hasGoogleAnalytics: boolean;
  hasSearchConsole: boolean;
};

export type WebsiteTicketAttachmentRow = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

export type WebsiteTicketRow = {
  id: string;
  type: WebsiteTicketType;
  priority: WebsiteTicketPriority;
  status: WebsiteTicketStatus;
  title: string;
  description: string | null;
  adminNote: string | null;
  canEdit: boolean;
  attachments: WebsiteTicketAttachmentRow[];
  createdAt: string;
  updatedAt: string;
};

export type WebsiteTicketListResult = {
  overview: WebsiteOverview;
  tickets: WebsiteTicketRow[];
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

function attachmentUrl(
  businessId: string,
  ticketId: string,
  attachmentId: string,
) {
  return `/api/business/${businessId}/website-tickets/${ticketId}/attachments/${attachmentId}`;
}

function serializeTicket(input: {
  id: string;
  businessId: string;
  type: WebsiteTicketType;
  priority: WebsiteTicketPriority;
  status: WebsiteTicketStatus;
  title: string;
  description: string | null;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
  }>;
}): WebsiteTicketRow {
  return {
    id: input.id,
    type: input.type,
    priority: input.priority,
    status: input.status,
    title: input.title,
    description: input.description,
    adminNote: input.adminNote,
    canEdit: input.status === "PENDING",
    attachments: input.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: attachmentUrl(input.businessId, input.id, attachment.id),
      createdAt: attachment.createdAt.toISOString(),
    })),
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

async function validateImageFiles(files: File[]) {
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { error: "Es werden nur Bild-Uploads unterstützt." as const };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: "Jedes Bild darf höchstens 5 MB gross sein." as const };
    }
  }

  return { ok: true as const };
}

async function storeTicketImages(input: {
  businessId: string;
  ticketId: string;
  files: File[];
}) {
  const records: Array<{
    id: string;
    businessId: string;
    ticketId: string;
    fileName: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }> = [];

  for (const file of input.files) {
    const id = crypto.randomUUID();
    const fileName = sanitizeFileName(file.name);
    const relativePath = path.join(input.businessId, input.ticketId, `${id}-${fileName}`);
    const absolutePath = path.join(UPLOAD_ROOT, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, bytes);
    records.push({
      id,
      businessId: input.businessId,
      ticketId: input.ticketId,
      fileName,
      mimeType: file.type,
      size: file.size,
      storagePath: relativePath,
    });
  }

  if (records.length > 0) {
    await prisma.websiteTicketAttachment.createMany({ data: records });
  }
}

async function removeTicketFiles(ticketId: string, businessId: string) {
  const dir = path.join(UPLOAD_ROOT, businessId, ticketId);
  await rm(dir, { recursive: true, force: true });
}

export async function listWebsiteTicketsForBusiness(
  businessId: string,
): Promise<WebsiteTicketListResult | null> {
  const [business, tickets] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        config: {
          select: {
            domain: true,
            hostingAccess: true,
            hasWebsite: true,
            hasGoogleAnalytics: true,
            hasSearchConsole: true,
          },
        },
      },
    }),
    prisma.websiteTicket.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: { attachments: { orderBy: { createdAt: "asc" } } },
    }),
  ]);

  if (!business) {
    return null;
  }

  return {
    overview: {
      domain: business.config?.domain ?? null,
      hostingAccessConfigured: Boolean(business.config?.hostingAccess),
      hasWebsite: business.config?.hasWebsite ?? false,
      hasGoogleAnalytics: business.config?.hasGoogleAnalytics ?? false,
      hasSearchConsole: business.config?.hasSearchConsole ?? false,
    },
    tickets: tickets.map(serializeTicket),
  };
}

export async function createWebsiteTicketForBusiness(input: {
  businessId: string;
  data: WebsiteTicketWriteInput;
  files: File[];
}) {
  const validation = await validateImageFiles(input.files);
  if ("error" in validation) {
    return validation;
  }

  const ticket = await prisma.websiteTicket.create({
    data: {
      businessId: input.businessId,
      type: input.data.type,
      priority: input.data.priority,
      title: input.data.title.trim(),
      description: input.data.description?.trim() || null,
    },
    include: { attachments: true },
  });

  try {
    await storeTicketImages({
      businessId: input.businessId,
      ticketId: ticket.id,
      files: input.files,
    });
  } catch (error) {
    await prisma.websiteTicket.delete({ where: { id: ticket.id } }).catch(() => {});
    await removeTicketFiles(ticket.id, input.businessId);
    throw error;
  }

  const created = await prisma.websiteTicket.findUniqueOrThrow({
    where: { id: ticket.id },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });

  return { ticket: serializeTicket(created) };
}

export async function updateWebsiteTicketForBusiness(input: {
  businessId: string;
  ticketId: string;
  data: WebsiteTicketWriteInput;
  files: File[];
}) {
  const existing = await prisma.websiteTicket.findFirst({
    where: { id: input.ticketId, businessId: input.businessId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const validation = await validateImageFiles(input.files);
  if ("error" in validation) {
    return validation;
  }

  await prisma.websiteTicket.update({
    where: { id: input.ticketId },
    data: {
      type: input.data.type,
      priority: input.data.priority,
      title: input.data.title.trim(),
      description: input.data.description?.trim() || null,
      ...(input.data.status ? { status: input.data.status } : {}),
      ...(input.data.adminNote !== undefined
        ? { adminNote: input.data.adminNote?.trim() || null }
        : {}),
    },
  });

  await storeTicketImages({
    businessId: input.businessId,
    ticketId: input.ticketId,
    files: input.files,
  });

  const updated = await prisma.websiteTicket.findUniqueOrThrow({
    where: { id: input.ticketId },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });

  return { ticket: serializeTicket(updated) };
}

export async function deleteWebsiteTicketForBusiness(
  businessId: string,
  ticketId: string,
) {
  const existing = await prisma.websiteTicket.findFirst({
    where: { id: ticketId, businessId },
    select: { id: true, status: true },
  });

  if (!existing) {
    return null;
  }
  if (existing.status !== "PENDING") {
    return { error: "Nur ausstehende Tickets können gelöscht werden." as const };
  }

  await prisma.websiteTicket.delete({ where: { id: ticketId } });
  await removeTicketFiles(ticketId, businessId);

  return { ok: true as const };
}

export async function getWebsiteTicketAttachmentForBusiness(input: {
  businessId: string;
  ticketId: string;
  attachmentId: string;
}) {
  const attachment = await prisma.websiteTicketAttachment.findFirst({
    where: {
      id: input.attachmentId,
      ticketId: input.ticketId,
      businessId: input.businessId,
      ticket: { businessId: input.businessId },
    },
  });

  if (!attachment) {
    return null;
  }

  const absolutePath = path.join(UPLOAD_ROOT, attachment.storagePath);
  const data = await readFile(absolutePath);

  return {
    data,
    mimeType: attachment.mimeType,
    fileName: attachment.fileName,
  };
}
