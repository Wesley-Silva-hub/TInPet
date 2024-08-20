-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nome_usuario" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);
