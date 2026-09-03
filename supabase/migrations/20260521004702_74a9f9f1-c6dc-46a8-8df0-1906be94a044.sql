-- Update the interval for data exclusion to 30 days
UPDATE public.assinaturas
SET excluir_dados_em = data_inadimplencia + interval '30 days'
WHERE status = 'inadimplente' AND data_inadimplencia IS NOT NULL;

-- Also update any future calculations if there's a trigger or logic (though it seems mostly handled by webhooks/code)
-- If we had a trigger, we would update it here. Based on previous migrations, it was a manual update.
