const db = require('./db');

class TurnoStatusManager {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
    }

    /**
     * Inicia el monitoreo automático cada 5 minutos
     */
    start() {
        if (this.isRunning) {
            console.log('🔄 TurnoStatusManager ya está ejecutándose');
            return;
        }

        console.log('🚀 Iniciando TurnoStatusManager - Monitoreo cada 5 minutos');
        this.isRunning = true;
        
        // Ejecutar inmediatamente
        this.verificarYActualizarEstados();
        
        // Ejecutar cada 5 minutos
        this.intervalId = setInterval(() => {
            this.verificarYActualizarEstados();
        }, 5 * 60 * 1000); // 5 minutos
    }

    /**
     * Detiene el monitoreo automático
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 TurnoStatusManager detenido');
    }

    /**
     * Verifica y actualiza todos los estados de turnos según las reglas de negocio
     */
    async verificarYActualizarEstados() {
        try {
            console.log('🔍 Verificando estados de turnos...');
            
            // Auto-expiración: disponible → expirado
            const expirados = await this.expirarTurnosDisponibles();
            
            // Auto-no realizado: reservado → no_realizado
            const noRealizados = await this.marcarTurnosNoRealizados();
            
            console.log(`📊 Verificación completada - Expirados: ${expirados}, No realizados: ${noRealizados}`);
            
        } catch (error) {
            console.error('❌ Error en verificación de estados:', error);
        }
    }

    /**
     * Marca turnos disponibles como expirados cuando pasa su hora de fin
     */
    async expirarTurnosDisponibles() {
        try {
            const [result] = await db.query(`
                UPDATE turno 
                SET estado = 'expirado', fecha_modificacion = NOW()
                WHERE estado = 'disponible' 
                AND CONCAT(fecha, ' ', IFNULL(hora_fin, ADDTIME(hora, SEC_TO_TIME(duracion_total * 60)))) < NOW()
            `);

            if (result.affectedRows > 0) {
                console.log(`⏰ ${result.affectedRows} turnos marcados como expirados`);
            }

            return result.affectedRows;
        } catch (error) {
            console.error('❌ Error al expirar turnos:', error);
            return 0;
        }
    }

    /**
     * Marca turnos reservados como no_realizado cuando pasa su hora de fin
     */
    async marcarTurnosNoRealizados() {
        try {
            const [result] = await db.query(`
                UPDATE turno 
                SET estado = 'no_realizado', fecha_modificacion = NOW()
                WHERE estado = 'reservado' 
                AND CONCAT(fecha, ' ', IFNULL(hora_fin, ADDTIME(hora, SEC_TO_TIME(duracion_total * 60)))) < NOW()
            `);

            if (result.affectedRows > 0) {
                console.log(`❌ ${result.affectedRows} turnos marcados como no realizados`);
            }

            return result.affectedRows;
        } catch (error) {
            console.error('❌ Error al marcar turnos no realizados:', error);
            return 0;
        }
    }

    /**
     * Verifica si se puede reservar/cancelar un turno (regla 48h)
     */
    static puedeModificarTurno(fechaTurno, horaTurno, esAdmin = false) {
        if (esAdmin) {
            return { puede: true, razon: 'Admin override' };
        }

        const fechaHoraTurno = new Date(`${fechaTurno} ${horaTurno}`);
        const ahora = new Date();
        const horasHastaElTurno = (fechaHoraTurno - ahora) / (1000 * 60 * 60);

        if (horasHastaElTurno < 48) {
            return {
                puede: false,
                razon: 'Se requieren mínimo 48 horas de anticipación',
                horasRestantes: Math.round(horasHastaElTurno * 10) / 10
            };
        }

        return {
            puede: true,
            horasRestantes: Math.round(horasHastaElTurno * 10) / 10
        };
    }

    /**
     * Reserva un turno para un cliente con validaciones
     */
    async reservarTurno(turnoId, clienteId, metodoPago = 'efectivo', esAdmin = false) {
        const conexion = await db.getConnection();
        
        try {
            await conexion.beginTransaction();
            
            // Obtener datos del turno
            const [turnos] = await conexion.query(
                'SELECT * FROM turno WHERE id_turno = ?',
                [turnoId]
            );
            
            if (turnos.length === 0) {
                throw new Error('Turno no encontrado');
            }

            const turno = turnos[0];

            if (turno.estado !== 'disponible') {
                throw new Error(`El turno no está disponible para reserva (Estado: ${turno.estado})`);
            }

            // Verificar regla de 48h
            const validacion = TurnoStatusManager.puedeModificarTurno(turno.fecha, turno.hora, esAdmin);
            if (!validacion.puede) {
                throw new Error(validacion.razon);
            }
            
            // Reservar el turno
            await conexion.query(
                'UPDATE turno SET id_cliente = ?, estado = ?, metodo_pago = ?, fecha_reserva = NOW(), fecha_modificacion = NOW() WHERE id_turno = ?',
                [clienteId, 'reservado', metodoPago, turnoId]
            );
            
            await conexion.commit();
            
            console.log(`✅ Turno ${turnoId} reservado para cliente ${clienteId} (${validacion.horasRestantes}h anticipación)`);
            
            return {
                success: true,
                mensaje: 'Turno reservado exitosamente',
                horasAnticipacion: validacion.horasRestantes
            };
            
        } catch (error) {
            await conexion.rollback();
            console.error('❌ Error al reservar turno:', error.message);
            throw error;
        } finally {
            conexion.release();
        }
    }

    /**
     * Cancela un turno con validaciones
     */
    async cancelarTurno(turnoId, usuarioId, esAdmin = false) {
        const conexion = await db.getConnection();
        
        try {
            await conexion.beginTransaction();
            
            // Obtener datos del turno
            const [turnos] = await conexion.query(
                'SELECT * FROM turno WHERE id_turno = ?',
                [turnoId]
            );
            
            if (turnos.length === 0) {
                throw new Error('Turno no encontrado');
            }

            const turno = turnos[0];

            if (!['reservado', 'disponible'].includes(turno.estado)) {
                throw new Error(`No se puede cancelar un turno en estado '${turno.estado}'`);
            }

            // Verificar permisos
            if (!esAdmin && turno.id_cliente && turno.id_cliente != usuarioId) {
                throw new Error('No tienes permisos para cancelar este turno');
            }

            // Verificar regla de 48h
            const validacion = TurnoStatusManager.puedeModificarTurno(turno.fecha, turno.hora, esAdmin);
            if (!validacion.puede) {
                throw new Error(validacion.razon);
            }
            
            // Cancelar el turno
            await conexion.query(
                'UPDATE turno SET estado = ?, id_cliente = NULL, fecha_modificacion = NOW() WHERE id_turno = ?',
                ['cancelado', turnoId]
            );
            
            await conexion.commit();
            
            console.log(`🚫 Turno ${turnoId} cancelado por usuario ${usuarioId} (${validacion.horasRestantes}h anticipación)`);
            
            return {
                success: true,
                mensaje: 'Turno cancelado exitosamente',
                horasAnticipacion: validacion.horasRestantes
            };
            
        } catch (error) {
            await conexion.rollback();
            console.error('❌ Error al cancelar turno:', error.message);
            throw error;
        } finally {
            conexion.release();
        }
    }

    /**
     * Confirma un turno como atendido (solo admin)
     */
    async confirmarTurno(turnoId) {
        try {
            const [result] = await db.query(
                'UPDATE turno SET estado = ?, fecha_modificacion = NOW() WHERE id_turno = ? AND estado = ?',
                ['atendido', turnoId, 'reservado']
            );

            if (result.affectedRows === 0) {
                throw new Error('Turno no encontrado o no está en estado reservado');
            }

            console.log(`✅ Turno ${turnoId} confirmado como atendido`);
            
            return {
                success: true,
                mensaje: 'Turno confirmado como atendido'
            };

        } catch (error) {
            console.error('❌ Error al confirmar turno:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de turnos por estado
     */
    async obtenerEstadisticas() {
        try {
            const [stats] = await db.query(`
                SELECT 
                    estado,
                    COUNT(*) as cantidad,
                    DATE(fecha) as fecha
                FROM turno 
                WHERE fecha >= CURDATE() - INTERVAL 30 DAY
                GROUP BY estado, DATE(fecha)
                ORDER BY fecha DESC, estado
            `);

            return stats;
        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            throw error;
        }
    }

    /**
     * Actualiza automáticamente el estado de turnos basado en reglas de negocio
     */
    async actualizarEstadosAutomaticamente() {
        try {
            console.log('🔄 Actualizando estados de turnos automáticamente...');
            
            const ahora = new Date();
            const fechaActual = ahora.toISOString().split('T')[0];
            const horaActual = ahora.toTimeString().split(' ')[0];
            
            // 1. Marcar turnos como expirados (turnos disponibles que ya pasaron)
            const [resultExpirados] = await this.db.query(`
                UPDATE turno 
                SET estado = 'expirado' 
                WHERE estado = 'disponible' 
                AND (fecha < ? OR (fecha = ? AND hora_fin < ?))
            `, [fechaActual, fechaActual, horaActual]);
            
            if (resultExpirados.affectedRows > 0) {
                console.log(`⏰ ${resultExpirados.affectedRows} turnos marcados como expirados`);
            }
            
            // 2. Marcar turnos reservados no realizados (pasó la hora y sigue reservado)
            const [resultNoRealizados] = await this.db.query(`
                UPDATE turno 
                SET estado = 'no_realizado' 
                WHERE estado = 'reservado' 
                AND (fecha < ? OR (fecha = ? AND hora_fin < ?))
            `, [fechaActual, fechaActual, horaActual]);
            
            if (resultNoRealizados.affectedRows > 0) {
                console.log(`❌ ${resultNoRealizados.affectedRows} turnos marcados como no realizados`);
            }
            
            console.log('✅ Actualización automática de estados completada');
            
        } catch (error) {
            console.error('❌ Error al actualizar estados automáticamente:', error.message);
            throw error;
        }
    }

    /**
     * Inicia el proceso automático de actualización de estados
     */
    iniciarActualizacionAutomatica() {
        // Ejecutar cada 15 minutos
        setInterval(async () => {
            try {
                await this.actualizarEstadosAutomaticamente();
            } catch (error) {
                console.error('Error en actualización automática:', error.message);
            }
        }, 15 * 60 * 1000); // 15 minutos
        
        // Ejecutar una vez al inicio
        setTimeout(async () => {
            try {
                await this.actualizarEstadosAutomaticamente();
            } catch (error) {
                console.error('Error en actualización inicial:', error.message);
            }
        }, 5000); // 5 segundos después del inicio
        
        console.log('🔄 Sistema de actualización automática de turnos iniciado');
    }
}

module.exports = TurnoStatusManager;
