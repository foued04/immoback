const Contract = require('../models/Contract.model');
const ApiError = require('../utils/ApiError');

const createContract = async (contractBody) => {
  return Contract.create(contractBody);
};

const getContractByRequestId = async (requestId) => {
  const contract = await Contract.findOne({ request: requestId })
    .populate('property')
    .populate('owner', 'fullName email phone')
    .populate('tenant', 'fullName email phone');
  return contract;
};

const getContractById = async (contractId) => {
    return Contract.findById(contractId)
        .populate('property')
        .populate('owner', 'fullName email phone')
        .populate('tenant', 'fullName email phone');
};

const updateContract = async (contractId, updateBody) => {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new ApiError(404, 'Contract not found');
  }
  Object.assign(contract, updateBody);
  await contract.save();
  return Contract.findById(contractId)
    .populate('property')
    .populate('owner', 'fullName email phone')
    .populate('tenant', 'fullName email phone');
};

module.exports = {
  createContract,
  getContractByRequestId,
  getContractById,
  updateContract,
};
