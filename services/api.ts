// Заглушка для будущей интеграции с Make/Zapier
export const sendToWebhook = async (payload: any): Promise<void> => {
  console.log('--- WEBHOOK OUTGOING ---');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('------------------------');
  
  // Имитация задержки сети
  return new Promise((resolve) => setTimeout(resolve, 800));
};