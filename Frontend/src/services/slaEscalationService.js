const Ticket = require('../models/Ticket');
const SLAPolicy = require('../models/SLAPolicy');
const Department = require('../models/Department');

const convertToMilliseconds = (value, unit) => {
  if (!value || !unit) return null;

  const normalizedUnit = unit.toUpperCase();

  if (normalizedUnit === 'MINUTES') {
    return value * 60 * 1000;
  }

  if (normalizedUnit === 'HOURS') {
    return value * 60 * 60 * 1000;
  }

  if (normalizedUnit === 'DAYS') {
    return value * 24 * 60 * 60 * 1000;
  }

  return null;
};

const findActiveSLAPolicyForDepartment = async (departmentId) => {
  const department = await Department.findById(departmentId);

  const possibleDepartmentValues = [
    departmentId?.toString(),
    department?.name,
  ].filter(Boolean);

  const policy = await SLAPolicy.findOne({
    status: 'ACTIVE',
    department: { $in: possibleDepartmentValues },
  });

  return policy;
};

const findActiveSLAPolicyForTicket = async (ticket) => {
  if (ticket.slaPolicy) {
    const assignedPolicy = await SLAPolicy.findById(ticket.slaPolicy);

    if (assignedPolicy && assignedPolicy.status === 'ACTIVE') {
      return assignedPolicy;
    }
  }

  return findActiveSLAPolicyForDepartment(ticket.department);
};

const checkSLAEscalations = async () => {
  try {
    const activeTickets = await Ticket.find({
      status: { $in: ['OPEN', 'IN_PROGRESS'] },
    });

    const now = new Date();

    for (const ticket of activeTickets) {
      const policy = await findActiveSLAPolicyForTicket(ticket);

      if (!policy) {
        continue;
      }

      const responseLimitMs = convertToMilliseconds(
        policy.responseTimeValue,
        policy.responseTimeUnit
      );

      const resolutionLimitMs = convertToMilliseconds(
        policy.resolutionTimeValue,
        policy.resolutionTimeUnit
      );

      const ticketAgeMs = now - new Date(ticket.createdAt);

      const responseBreached = responseLimitMs && ticketAgeMs > responseLimitMs;
      const resolutionBreached = resolutionLimitMs && ticketAgeMs > resolutionLimitMs;

      if (responseBreached || resolutionBreached) {
        ticket.status = 'ESCALATED';
        ticket.slaPolicy = policy._id;
        ticket.autoEscalated = true;
        ticket.escalatedAt = new Date();
        ticket.escalationReason = responseBreached
          ? 'SLA response time breached'
          : 'SLA resolution time breached';

        await ticket.save();

        console.log(
          `[AUTO SLA ESCALATION] Ticket ${ticket._id} escalated using policy "${policy.name}"`
        );
      }
    }
  } catch (error) {
    console.error('[AUTO SLA ESCALATION ERROR]', error.message);
  }
};

const startSLAEscalationJob = () => {
  console.log('SLA auto escalation job started');

  checkSLAEscalations();

  setInterval(() => {
    checkSLAEscalations();
  }, 60 * 1000);
};

module.exports = {
  convertToMilliseconds,
  findActiveSLAPolicyForDepartment,
  findActiveSLAPolicyForTicket,
  checkSLAEscalations,
  startSLAEscalationJob,
};