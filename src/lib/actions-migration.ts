'use server';

import { db } from './firebase/client';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { getStoreNameMap } from './store-utils';
import { revalidatePath } from 'next/cache';

export async function refreshCampaignStores(campaignId: string): Promise<{ success: boolean; message: string }> {
    try {
        const campaignRef = doc(db, 'quick_send_campaigns', campaignId);
        const contactsRef = collection(campaignRef, 'contacts');

        // 1. Fetch all contacts
        const snapshot = await getDocs(contactsRef);

        if (snapshot.empty) {
            return { success: false, message: 'Nenhum contato encontrado na campanha.' };
        }

        // 2. Extract unique store IDs
        const storeIdsSet = new Set<string>();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const sId = data.dynamic_fields?.storeId;
            if (sId) storeIdsSet.add(String(sId));
        });

        const storeIds = Array.from(storeIdsSet);

        if (storeIds.length === 0) {
            return { success: false, message: 'Contatos não possuem IDs de loja.' };
        }

        // 3. Map Store Names
        const nameMap = await getStoreNameMap();
        const stores = storeIds.map(id => ({
            id: id,
            name: nameMap[id] || `Loja ${id}`
        }));

        // 4. Update Campaign
        await updateDoc(campaignRef, {
            store_ids: storeIds,
            stores: stores
        });

        revalidatePath('/campaigns');
        return { success: true, message: `Dados atualizados: ${stores.length} lojas encontradas.` };

    } catch (error: any) {
        console.error('Error refreshing campaign stores:', error);
        return { success: false, message: `Erro ao atualizar: ${error.message}` };
    }
}
