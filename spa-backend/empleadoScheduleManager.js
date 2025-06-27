const db = require('./db');

class EmpleadoScheduleManager {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Obtener cronograma de un empleado para una fecha específica
     */
    async obtenerCronograma(empleadoId, fecha) {
        try {
            const [turnos] = await db.query(`
                SELECT 
                    t.id_turno,
                    t.fecha,
                    t.hora,
                    t.hora_fin,
                    t.estado,
                    t.duracion_total,
                    GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios,
                    CASE 
                        WHEN c.nombre IS NOT NULL THEN CONCAT(c.nombre, ' ', c.apellido)
                        ELSE 'Sin cliente asignado'
                    END as cliente
                FROM turno t
                JOIN turno_empleado te ON t.id_turno = te.id_turno
                LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
                LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
                LEFT JOIN cliente c ON t.id_cliente = c.id_cliente
                WHERE te.id_empleado = ? AND t.fecha = ?
                GROUP BY t.id_turno
                ORDER BY t.hora ASC
            `, [empleadoId, fecha]);

            return turnos;
        } catch (error) {
            console.error('Error obteniendo cronograma:', error);
            throw error;
        }
    }

    /**
     * Verificar disponibilidad de múltiples empleados
     */
    async verificarDisponibilidadMultiple(empleadosIds, fecha, horaInicio, horaFin, turnoExcluir = null) {
        const disponibles = [];
        const conflictos = [];

        for (const empleadoId of empleadosIds) {
            try {
                const disponible = await this.verificarDisponibilidadEmpleado(
                    empleadoId, fecha, horaInicio, horaFin, turnoExcluir
                );

                if (disponible.disponible) {
                    disponibles.push({
                        id: empleadoId,
                        nombre: disponible.nombre
                    });
                } else {
                    conflictos.push({
                        id: empleadoId,
                        nombre: disponible.nombre,
                        mensaje: disponible.mensaje,
                        turnosConflictivos: disponible.turnosConflictivos
                    });
                }
            } catch (error) {
                console.error(`Error verificando empleado ${empleadoId}:`, error);
                conflictos.push({
                    id: empleadoId,
                    nombre: `Empleado ${empleadoId}`,
                    mensaje: 'Error al verificar disponibilidad',
                    turnosConflictivos: []
                });
            }
        }

        return { disponibles, conflictos };
    }

    /**
     * Verificar disponibilidad de un empleado específico
     */
    async verificarDisponibilidadEmpleado(empleadoId, fecha, horaInicio, horaFin, turnoExcluir = null) {
        try {
            // Obtener información del empleado
            const [empleadoInfo] = await db.query(
                'SELECT CONCAT(nombre, " ", apellido) as nombre_completo FROM empleado WHERE id_empleado = ?',
                [empleadoId]
            );

            if (empleadoInfo.length === 0) {
                return {
                    disponible: false,
                    nombre: `Empleado ${empleadoId}`,
                    mensaje: 'Empleado no encontrado',
                    turnosConflictivos: []
                };
            }

            const nombreEmpleado = empleadoInfo[0].nombre_completo;

            // Buscar turnos conflictivos
            let query = `
                SELECT t.id_turno, t.hora, t.hora_fin, t.estado
                FROM turno t
                JOIN turno_empleado te ON t.id_turno = te.id_turno
                WHERE te.id_empleado = ? 
                AND t.fecha = ?
                AND t.estado IN ('disponible', 'reservado')
                AND (
                    (t.hora < ? AND t.hora_fin > ?) OR
                    (t.hora < ? AND t.hora_fin > ?) OR
                    (t.hora >= ? AND t.hora_fin <= ?)
                )
            `;

            let params = [
                empleadoId, fecha,
                horaFin, horaInicio,
                horaFin, horaFin,
                horaInicio, horaFin
            ];

            // Excluir turno específico si se proporciona
            if (turnoExcluir) {
                query += ' AND t.id_turno != ?';
                params.push(turnoExcluir);
            }

            const [turnosConflictivos] = await db.query(query, params);

            if (turnosConflictivos.length > 0) {
                console.log(`❌ Conflicto de horario para empleado ${empleadoId}:`);
                turnosConflictivos.forEach(turno => {
                    console.log(`   - Turno ${turno.id_turno}: ${turno.hora}-${turno.hora_fin} (${nombreEmpleado})`);
                });

                return {
                    disponible: false,
                    nombre: nombreEmpleado,
                    mensaje: `${nombreEmpleado} no está disponible en el horario ${horaInicio}-${horaFin}`,
                    turnosConflictivos: turnosConflictivos
                };
            }

            return {
                disponible: true,
                nombre: nombreEmpleado,
                mensaje: `${nombreEmpleado} disponible`,
                turnosConflictivos: []
            };

        } catch (error) {
            console.error(`Error verificando empleado ${empleadoId}:`, error);
            return {
                disponible: false,
                nombre: `Empleado ${empleadoId}`,
                mensaje: 'Error al verificar disponibilidad',
                turnosConflictivos: []
            };
        }
    }

    /**
     * Validar asignación de empleados a un turno específico
     */
    async validarAsignacion(turnoId, empleadosIds) {
        try {
            // Obtener información del turno
            const [turnoInfo] = await db.query(
                'SELECT fecha, hora, hora_fin FROM turno WHERE id_turno = ?',
                [turnoId]
            );

            if (turnoInfo.length === 0) {
                return {
                    valido: false,
                    mensaje: 'Turno no encontrado',
                    errores: ['Turno no encontrado'],
                    empleadosDisponibles: [],
                    empleadosConConflicto: []
                };
            }

            const { fecha, hora, hora_fin } = turnoInfo[0];

            // Verificar disponibilidad de empleados
            const resultado = await this.verificarDisponibilidadMultiple(
                empleadosIds, fecha, hora, hora_fin, turnoId
            );

            const valido = resultado.conflictos.length === 0;
            const errores = resultado.conflictos.map(conflicto => conflicto.mensaje);

            return {
                valido,
                mensaje: valido ? 'Todos los empleados están disponibles' : 'Hay conflictos de horario',
                errores,
                empleadosDisponibles: resultado.disponibles,
                empleadosConConflicto: resultado.conflictos
            };

        } catch (error) {
            console.error('Error validando asignación:', error);
            return {
                valido: false,
                mensaje: 'Error en la validación',
                errores: ['Error interno del servidor'],
                empleadosDisponibles: [],
                empleadosConConflicto: []
            };
        }
    }
}

module.exports = EmpleadoScheduleManager;
