const nodemailer = require('nodemailer');

// Configurar el transporte de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Función para enviar credenciales de acceso
const sendInvitationCode = async (email, password) => {
    // Validar que tengamos los datos necesarios
    if (!email || !password) {
        throw new Error('Faltan datos requeridos: email y password');
    }

    // Configurar opciones del correo
    const mailOptions = {
        from: `"Sentirse Bien Spa" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "🔑 Tus credenciales de acceso - Sentirse Bien Spa",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background-color: #4a6baf; padding: 20px; text-align: center;">
                <img src="https://ejemplo.com/logo.png" alt="Logo Sentirse Bien Spa" style="max-height: 80px;">
            </div>
            
            <div style="padding: 20px;">
                <h2 style="color: #4a6baf;">¡Bienvenido al sistema de gestión de Sentirse Bien Spa!</h2>
                
                <p>Se han creado tus credenciales de acceso al sistema administrativo:</p>
                
                <div style="background: #f8f9fa; border-left: 4px solid #4a6baf; padding: 15px; margin: 20px 0;">
                    <p><strong>Correo electrónico:</strong> ${email}</p>
                    <p><strong>Contraseña temporal:</strong> <span style="font-family: monospace; font-size: 1.1em;">${password}</span></p>
                </div>
                
                <p style="font-weight: bold; color: #d32f2f;">Por seguridad, deberás cambiar esta contraseña en tu primer inicio de sesión.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://9plm87v2-3000.brs.devtunnels.ms/login.html" 
                       style="background-color: #4a6baf; color: white; padding: 12px 25px; 
                              text-decoration: none; border-radius: 4px; font-weight: bold;">
                        Acceder al sistema
                    </a>
                </div>
                
                <p>Si no solicitaste este acceso, por favor ignora este mensaje o contacta al administrador del sistema.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p style="font-size: 0.9em; color: #666;">
                    Este es un correo automático, por favor no respondas a este mensaje.<br>
                    © ${new Date().getFullYear()} Sentirse Bien Spa. Todos los derechos reservados.
                </p>
            </div>
        </div>
        `,
        text: `Bienvenido al sistema de gestión de Sentirse Bien Spa!

Tus credenciales de acceso son:
- Correo electrónico: ${email}
- Contraseña temporal: ${password}

Por seguridad, deberás cambiar esta contraseña en tu primer inicio de sesión.

Accede al sistema en: https://9plm87v2-3000.brs.devtunnels.ms/login.html

Este es un correo automático, por favor no respondas a este mensaje.
© ${new Date().getFullYear()} Sentirse Bien Spa. Todos los derechos reservados.`
    };

    try {
        console.log(`[Mailer] Preparando envío de credenciales a: ${email}`);
        
        // Verificar conexión con el servidor SMTP primero
        await transporter.verify();
        console.log('[Mailer] Conexión con servidor SMTP verificada');
        
        // Enviar el correo
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Mailer] Correo enviado con éxito a ${email}`, info.messageId);
        
        return {
            success: true,
            messageId: info.messageId,
            email: email
        };
    } catch (error) {
        console.error('[Mailer] Error al enviar correo:', error);
        
        // Detalles adicionales para depuración
        const errorInfo = {
            error: error.message,
            email: email,
            time: new Date().toISOString(),
            smtpConfig: {
                service: 'gmail',
                user: process.env.EMAIL_USER
            }
        };
        
        throw {
            ...errorInfo,
            toString: () => `Error al enviar correo: ${error.message}`
        };
    }
};

module.exports = { sendInvitationCode };