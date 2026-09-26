import type { AnswerType, Prisma, ProjectStatus } from "@prisma/client";
import { prisma } from "./prisma";

export type ProjectDraftInput = {
  name: string;
  description?: string | null;
  stage?: string | null;
  businessType?: string | null;
  market?: string | null;
  customerType?: string | null;
  goal?: string | null;
};

export type ValidationAnswerInput = {
  projectId: number;
  questionId: string;
  type: AnswerType;
  value: Prisma.InputJsonValue;
  note?: string | null;
};

export async function createProject(userId: number, input: ProjectDraftInput) {
  return prisma.project.create({
    data: {
      userId,
      name: input.name,
      description: input.description ?? null,
      stage: input.stage ?? null,
      businessType: input.businessType ?? null,
      market: input.market ?? null,
      customerType: input.customerType ?? null,
      goal: input.goal ?? null,
    },
  });
}

export async function updateProject(
  userId: number,
  projectId: number,
  input: Partial<ProjectDraftInput> & { status?: ProjectStatus; score?: number | null },
) {
  return prisma.project.updateMany({
    where: { id: projectId, userId },
    data: input,
  });
}

export async function listProjects(userId: number) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { answers: true } } },
  });
}

export async function getProject(userId: number, projectId: number) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { answers: { orderBy: { questionId: "asc" } } },
  });
}

export async function saveValidationAnswer(userId: number, input: ValidationAnswerInput) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, userId },
    select: { id: true },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return upsertValidationAnswer(prisma, input);
}

async function upsertValidationAnswer(
  client: Prisma.TransactionClient,
  input: ValidationAnswerInput,
) {
  return client.validationAnswer.upsert({
    where: {
      projectId_questionId: {
        projectId: input.projectId,
        questionId: input.questionId,
      },
    },
    create: {
      projectId: input.projectId,
      questionId: input.questionId,
      type: input.type,
      value: input.value,
      note: input.note ?? null,
    },
    update: {
      type: input.type,
      value: input.value,
      note: input.note ?? null,
    },
  });
}

export async function saveValidationAnswers(
  userId: number,
  answers: ValidationAnswerInput[],
) {
  return prisma.$transaction(async (tx) => {
    for (const answer of answers) {
      const project = await tx.project.findFirst({
        where: { id: answer.projectId, userId },
        select: { id: true },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      await upsertValidationAnswer(tx, answer);
    }

    return tx.validationAnswer.findMany({
      where: { projectId: { in: answers.map((answer) => answer.projectId) } },
      orderBy: { questionId: "asc" },
    });
  });
}
