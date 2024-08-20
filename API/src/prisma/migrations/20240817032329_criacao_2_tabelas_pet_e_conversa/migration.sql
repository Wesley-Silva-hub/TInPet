-- CreateTable
CREATE TABLE "Pet" (
    "id_pet" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nome_pet" TEXT NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id_pet")
);

-- CreateTable
CREATE TABLE "Conversa" (
    "id_conversa" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversa_pkey" PRIMARY KEY ("id_conversa")
);
