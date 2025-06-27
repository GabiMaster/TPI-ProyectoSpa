const db = require('./db');

class TurnoStatusManager {
    constructor() {
        this.intervalId = null;
    }

    // Iniciar el sistema de monitoreo automático
    start() {
        console.log('🕐 Iniciando sistema de monitoreo de turnos...');
        
        // Ejecutar inmediatamente
        this.checkAndUpdateTurnos();
        
        // Ejecutar cada 5 minutos
        this.intervalId = setInterval(() => {
            this.checkAndUpdateTurnos();
        }, 5 * 60 * 1000); // 5 minutos
    }

    // Detener el sistema de monitoreo
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏹️ Sistema de monitoreo de turnos detenido');
        }
    }

    // Verificar y actualizar estados de turnos
    async checkAndUpdateTurnos() {
        try {
            console.log('🔍 Verificando estados de turnos...');
            
            await this.expirarTurnosDisponibles();
            await this.marcarTurnosNoRealizados();
            
            console.log('✅ Verificación de turnos completada');
            
        } catch (error) {
            console.error('❌ Error al verificar turnos:', error);
        }
    }

    // Expirar turnos disponibles que ya pasaron su fecha/hora
    async expirarTurnosDisponibles() {
        const query = `
            UPDATE turno 
            SET estado = 'expirado', 
                fecha_modificacion = CURRENT_TIMESTAMP
            WHERE estado = 'disponible' 
            AND CONCAT(fecha, ' ', COALESCE(hora_fin, hora)) < NOW()
        `;
        
        const [result] = await db.query(query);
        
        if (result.affectedRows > 0) {
            console.log(`⏰ ${result.affectedRows} turnos disponibles han expirado (pasaron su fecha/hora)`);
        }
    }

    // Marcar turnos reservados como no realizados si pasó su hora de finalización
    async marcarTurnosNoRealizados() {
        const query = `
            UPDATE turno 
            SET estado = 'no_realizado',
                fecha_modificacion = CURRENT_TIMESTAMP
            WHERE estado = 'reservado' 
            AND CONCAT(fecha, ' ', hora_fin) < NOW()
        `;
        
        const [result] = await db.query(query);
        
        if (result.affectedRows > 0) {
            console.log(`⚠️ ${result.affectedRows} turnos reservados marcados como no realizados`);
        }
    }

    // Verificar si un turno puede ser reservado (más de 48 horas)
    async puedeSerReservado(turnoId) {
        const [rows] = await db.query(`
            SELECT TIMESTAMPDIFF(HOUR, NOW(), CONCAT(fecha, ' ', hora)) as horas_restantes
            FROM turno 
            WHERE id_turno = ? AND estado = 'disponible'
        `, [turnoId]);
        
        if (rows.length === 0) {
            return false;
        }
        
        return rows[0].horas_restantes >= 48;
    }

    // Verificar si un turno puede ser cancelado por el cliente (más de 48 horas)
    async puedeCancelarCliente(turnoId, clienteId) {
        const [rows] = await db.query(`
            SELECT TIMESTAMPDIFF(HOUR, NOW(), CONCAT(fecha, ' ', hora)) as horas_restantes
            FROM turno 
            WHERE id_turno = ? AND id_cliente = ? AND estado = 'reservado'
        `, [turnoId, clienteId]);
        
        if (rows.length === 0) {
            return false;
        }
        
        return rows[0].horas_restantes >= 48;
    }

    // Reservar un turno
    async reservarTurno(turnoId, clienteId) {
        try {
            // Verificar si puede ser reservado
            const puedeReservar = await this.puedeSerReservado(turnoId);
            if (!puedeReservar) {
                throw new Error('El turno no puede ser reservado (menos de 48 horas o no disponible)');
            }

            // Reservar el turno
            const [result] = await db.query(`
                UPDATE turno 
                SET estado = 'reservado', 
                    id_cliente = ?, 
                    fecha_reserva = CURRENT_TIMESTAMP,
                    fecha_modificacion = CURRENT_TIMESTAMP
                WHERE id_turno = ? AND estado = 'disponible'
            `, [clienteId, turnoId]);

            if (result.affectedRows === 0) {
                throw new Error('No se pudo reservar el turno');
            }

            console.log(`📅 Turno ${turnoId} reservado por cliente ${clienteId}`);
            return true;

        } catch (error) {
            console.error('Error al reservar turno:', error);
            throw error;
        }
    }

    // Confirmar turno (marcar como atendido) - Solo admin
    async confirmarTurno(turnoId) {
        try {
            const [result] = await db.query(`
                UPDATE turno 
                SET estado = 'atendido',
                    fecha_modificacion = CURRENT_TIMESTAMP
                WHERE id_turno = ? AND estado = 'reservado'
            `, [turnoId]);

            if (result.affectedRows === 0) {
                throw new Error('No se pudo confirmar el turno');
            }

            console.log(`✅ Turno ${turnoId} confirmado como atendido`);
            return true;

        } catch (error) {
            console.error('Error al confirmar turno:', error);
            throw error;
        }
    }

    // Cancelar turno
    async cancelarTurno(turnoId, clienteId = null) {
        try {
            let query, params;
            
            if (clienteId) {
                // Cliente cancelando - verificar las 48 horas
                const puedeCancelar = await this.puedeCancelarCliente(turnoId, clienteId);
                if (!puedeCancelar) {
                    throw new Error('No puedes cancelar el turno (menos de 48 horas o no es tu turno)');
                }
                
                query = `
                    UPDATE turno 
                    SET estado = 'cancelado',
                        fecha_modificacion = CURRENT_TIMESTAMP
                    WHERE id_turno = ? AND id_cliente = ? AND estado = 'reservado'
                `;
                params = [turnoId, clienteId];
            } else {
                // Admin cancelando - sin restricciones de tiempo
                query = `
                    UPDATE turno 
                    SET estado = 'cancelado',
                        fecha_modificacion = CURRENT_TIMESTAMP
                    WHERE id_turno = ? AND estado = 'reservado'
                `;
                params = [turnoId];
            }

            const [result] = await db.query(query, params);

            if (result.affectedRows === 0) {
                throw new Error('No se pudo cancelar el turno');
            }

            console.log(`❌ Turno ${turnoId} cancelado`);
            return true;

        } catch (error) {
            console.error('Error al cancelar turno:', error);
            throw error;
        }
    }
}

module.exports = TurnoStatusManager;
