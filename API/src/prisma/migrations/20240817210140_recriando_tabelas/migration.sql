/*
  Warnings:

  - You are about to alter the column `nome_pet` on the `Pet` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the column `nome_usuario` on the `Usuario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conversa" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "nome_pet" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "nome_usuario",
ADD COLUMN     "biografia" VARCHAR(200) NOT NULL DEFAULT '',
ADD COLUMN     "contador_curtida" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "data_nascimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "email" VARCHAR(200),
ADD COLUMN     "foto_url_usuario" VARCHAR(1000)[],
ADD COLUMN     "id_estadoCivil" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "id_profissao" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "id_tipo_usuario" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "latitude_usuario" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "longitude_usuario" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "nomeUsuario" VARCHAR(200),
ADD COLUMN     "nome_completo" VARCHAR(200),
ADD COLUMN     "senha_hash" VARCHAR(200);

-- CreateTable
CREATE TABLE "EstadoCivil" (
    "id_estadoCivil" SERIAL NOT NULL,
    "descricao" VARCHAR(50) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EstadoCivil_pkey" PRIMARY KEY ("id_estadoCivil")
);

-- CreateTable
CREATE TABLE "Profissao" (
    "id_profissao" SERIAL NOT NULL,
    "descricao" VARCHAR(50) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Profissao_pkey" PRIMARY KEY ("id_profissao")
);

-- CreateTable
CREATE TABLE "Tipo_Usuario" (
    "id_tipo_usuario" SERIAL NOT NULL,
    "descricao" VARCHAR(50) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tipo_Usuario_pkey" PRIMARY KEY ("id_tipo_usuario")
);

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_estadoCivil_fkey" FOREIGN KEY ("id_estadoCivil") REFERENCES "EstadoCivil"("id_estadoCivil") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_profissao_fkey" FOREIGN KEY ("id_profissao") REFERENCES "Profissao"("id_profissao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_tipo_usuario_fkey" FOREIGN KEY ("id_tipo_usuario") REFERENCES "Tipo_Usuario"("id_tipo_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
