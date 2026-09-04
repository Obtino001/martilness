
import json
import re

with open("templates/page.contact.json", "r", encoding="utf-8") as f:
    text = f.read()

# Remove JS block comments
text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)

data = json.loads(text)

group = data["sections"]["custom_section_tUbpGU"]["blocks"]["group_4wEPx4"]

group["blocks"] = {
    "text_intro": {
        "type": "_simple-text",
        "settings": {
            "text": "<h3 style=\"margin-bottom: 1rem;\">Vi er her for at hjælpe!</h3><p>Hvis du har spørgsmål, store som små, eller har brug for mere information om vores produkter, tøv endelig ikke med at kontakte os. Vores team står klar til at hjælpe dig, så du får den bedste oplevelse og de svar, du søger.</p><p style=\"margin-top: 1rem;\">Vi glæder os til at høre fra dig!</p>",
            "type_preset": "rte",
            "text_color": "text"
        }
    },
    "text_return": {
        "type": "_simple-text",
        "settings": {
            "text": "<h5 style=\"margin-bottom: 0.2rem;\">Returnering eller reklamation</h5><p>Skal du returnere eller reklamere over et produkt kan du gå direkte her til vores <a href=\"/pages/returnering\" style=\"color: rgb(var(--color-primary-button-background));\">returportal</a> eller vores <a href=\"/pages/reklamation\" style=\"color: rgb(var(--color-primary-button-background));\">reklamationsside</a>.</p>",
            "type_preset": "rte",
            "text_color": "text"
        }
    },
    "text_address": {
        "type": "_simple-text",
        "settings": {
            "text": "<h5 style=\"margin-bottom: 0.2rem;\">Martilness</h5><p>Baunebakkevej 12, 2.th<br>2650 Hvidovre<br>CVR: 35633146</p>",
            "type_preset": "rte",
            "text_color": "text"
        }
    },
    "text_phone": {
        "type": "_simple-text",
        "settings": {
            "text": "<p style=\"display: flex; align-items: center; gap: 8px; color: rgb(var(--color-primary-button-background));\"><svg style=\"width: 16px; height: 16px; margin-bottom: -1px;\" fill=\"currentColor\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z\"></path></svg><a href=\"tel:+4527796900\" style=\"color: rgb(var(--color-primary-button-background)); text-decoration: none;\">Tlf.: +45 2779 6900</a></p>",
            "type_preset": "rte"
        }
    },
    "text_email": {
        "type": "_simple-text",
        "settings": {
            "text": "<p style=\"display: flex; align-items: center; gap: 8px; color: rgb(var(--color-primary-button-background)); margin-top: -10px;\"><svg style=\"width: 16px; height: 16px; margin-bottom: -1px;\" fill=\"currentColor\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z\"></path><path d=\"M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z\"></path></svg><a href=\"mailto:info@martilness.dk\" style=\"color: rgb(var(--color-primary-button-background)); text-decoration: none;\">info@martilness.dk</a></p>",
            "type_preset": "rte"
        }
    }
}
group["block_order"] = ["text_intro", "text_return", "text_address", "text_phone", "text_email"]

data["sections"]["main"]["disabled"] = True

output = "/*\n * ------------------------------------------------------------\n * IMPORTANT: The contents of this file are auto-generated.\n *\n * This file may be updated by the Shopify admin theme editor\n * or related systems. Please exercise caution as any changes\n * made to this file may be overwritten.\n * ------------------------------------------------------------\n */\n" + json.dumps(data, indent=2, ensure_ascii=False)

with open("templates/page.contact.json", "w", encoding="utf-8") as f:
    f.write(output)

