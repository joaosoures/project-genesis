-- Update existing records
UPDATE public.assinaturas 
SET metodo_pagamento = 'Cartão de Crédito' 
WHERE metodo_pagamento = 'paddle' OR metodo_pagamento = 'stripe';

UPDATE public.pagamentos 
SET metodo = 'Cartão de Crédito' 
WHERE metodo = 'paddle' OR metodo = 'stripe';

-- Ensure the 60-day policy is reflected in existing delinquent accounts if any
UPDATE public.assinaturas
SET excluir_dados_em = data_inadimplencia + interval '60 days'
WHERE status = 'inadimplente' AND data_inadimplencia IS NOT NULL;
