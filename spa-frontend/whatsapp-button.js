/**
 * Botón flotante de WhatsApp
 * Este componente se puede incluir en cualquier página del spa
 */

class WhatsAppButton {
    constructor() {
        this.whatsappUrl = 'https://wa.link/osb23b';
        this.init();
    }

    init() {
        this.createButton();
        this.bindEvents();
    }

    createButton() {
        // Verificar si el botón ya existe
        if (document.getElementById('whatsapp-button')) {
            return;
        }

        // Crear el botón
        const button = document.createElement('a');
        button.id = 'whatsapp-button';
        button.className = 'whatsapp-float';
        button.href = this.whatsappUrl;
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
        button.title = 'Chatea con nosotros en WhatsApp';
        button.setAttribute('aria-label', 'Contactar por WhatsApp');

        // SVG del icono de WhatsApp
        button.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.520-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.891 3.486"/>
            </svg>
        `;

        // Agregar el botón al body
        document.body.appendChild(button);

        console.log('✅ Botón de WhatsApp creado y agregado');
    }

    bindEvents() {
        const button = document.getElementById('whatsapp-button');
        if (!button) return;

        // Evento de click (opcional, ya que es un enlace)
        button.addEventListener('click', (e) => {
            // Tracking opcional para analytics
            console.log('📱 Click en botón de WhatsApp');
            
            // Opcional: Agregar tracking de Google Analytics si está disponible
            if (typeof gtag !== 'undefined') {
                gtag('event', 'click', {
                    event_category: 'WhatsApp',
                    event_label: 'Botón Flotante',
                    value: 1
                });
            }
        });

        // Eventos de hover para mejorar la experiencia
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
    }

    // Método para ocultar el botón temporalmente
    hide() {
        const button = document.getElementById('whatsapp-button');
        if (button) {
            button.style.display = 'none';
        }
    }

    // Método para mostrar el botón
    show() {
        const button = document.getElementById('whatsapp-button');
        if (button) {
            button.style.display = 'flex';
        }
    }

    // Método para cambiar la URL de WhatsApp (si es necesario)
    updateUrl(newUrl) {
        const button = document.getElementById('whatsapp-button');
        if (button) {
            button.href = newUrl;
            this.whatsappUrl = newUrl;
        }
    }
}

// Función para inicializar el botón automáticamente
function initWhatsAppButton() {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new WhatsAppButton();
        });
    } else {
        new WhatsAppButton();
    }
}

// Inicializar automáticamente cuando se carga el script
initWhatsAppButton();

// Exportar para uso manual si es necesario
window.WhatsAppButton = WhatsAppButton;
