-- Adiciona ate 3 fotos extras ao cadastro de patrimonio (total de 4, junto com photo_url ja existente).
-- Colunas opcionais, aditivas — nao altera nem remove nenhum dado existente.
ALTER TABLE "assets" ADD COLUMN "photo_url_2" TEXT;
ALTER TABLE "assets" ADD COLUMN "photo_url_3" TEXT;
ALTER TABLE "assets" ADD COLUMN "photo_url_4" TEXT;
