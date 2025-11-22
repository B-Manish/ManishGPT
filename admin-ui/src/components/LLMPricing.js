import React, { useState } from 'react';

const LLMPricing = () => {
  const [activeTier, setActiveTier] = useState('batch');

  // Pricing data from the screenshot and additional tiers
  const pricingData = {
    batch: [
      { model: 'gpt-5.1', input: 0.625, cachedInput: 0.0625, output: 5.00 },
      { model: 'gpt-5', input: 0.625, cachedInput: 0.0625, output: 5.00 },
      { model: 'gpt-5-mini', input: 0.125, cachedInput: 0.0125, output: 1.00 },
      { model: 'gpt-5-nano', input: 0.025, cachedInput: 0.0025, output: 0.20 },
      { model: 'gpt-5-pro', input: 7.50, cachedInput: null, output: 60.00 },
      { model: 'gpt-4.1', input: 1.00, cachedInput: null, output: 4.00 },
      { model: 'gpt-4.1-mini', input: 0.20, cachedInput: null, output: 0.80 },
      { model: 'gpt-4.1-nano', input: 0.05, cachedInput: null, output: 0.20 },
      { model: 'gpt-4o', input: 1.25, cachedInput: null, output: 5.00 },
      { model: 'gpt-4o-2024-05-13', input: 2.50, cachedInput: null, output: 7.50 },
      { model: 'gpt-4o-mini', input: 0.075, cachedInput: null, output: 0.30 },
    ],
    flex: [
      { model: 'gpt-5.1', input: 1.25, cachedInput: 0.125, output: 10.00 },
      { model: 'gpt-5', input: 1.25, cachedInput: 0.125, output: 10.00 },
      { model: 'gpt-5-mini', input: 0.25, cachedInput: 0.025, output: 2.00 },
      { model: 'gpt-5-nano', input: 0.05, cachedInput: 0.005, output: 0.40 },
      { model: 'gpt-5-pro', input: 15.00, cachedInput: null, output: 120.00 },
      { model: 'gpt-4.1', input: 2.00, cachedInput: null, output: 8.00 },
      { model: 'gpt-4.1-mini', input: 0.40, cachedInput: null, output: 1.60 },
      { model: 'gpt-4.1-nano', input: 0.10, cachedInput: null, output: 0.40 },
      { model: 'gpt-4o', input: 2.50, cachedInput: null, output: 10.00 },
      { model: 'gpt-4o-2024-05-13', input: 5.00, cachedInput: null, output: 15.00 },
      { model: 'gpt-4o-mini', input: 0.15, cachedInput: null, output: 0.60 },
    ],
    standard: [
      { model: 'gpt-5.1', input: 2.50, cachedInput: 0.25, output: 20.00 },
      { model: 'gpt-5', input: 2.50, cachedInput: 0.25, output: 20.00 },
      { model: 'gpt-5-mini', input: 0.50, cachedInput: 0.05, output: 4.00 },
      { model: 'gpt-5-nano', input: 0.10, cachedInput: 0.01, output: 0.80 },
      { model: 'gpt-5-pro', input: 30.00, cachedInput: null, output: 240.00 },
      { model: 'gpt-4.1', input: 4.00, cachedInput: null, output: 16.00 },
      { model: 'gpt-4.1-mini', input: 0.80, cachedInput: null, output: 3.20 },
      { model: 'gpt-4.1-nano', input: 0.20, cachedInput: null, output: 0.80 },
      { model: 'gpt-4o', input: 5.00, cachedInput: null, output: 20.00 },
      { model: 'gpt-4o-2024-05-13', input: 10.00, cachedInput: null, output: 30.00 },
      { model: 'gpt-4o-mini', input: 0.30, cachedInput: null, output: 1.20 },
    ],
    priority: [
      { model: 'gpt-5.1', input: 5.00, cachedInput: 0.50, output: 40.00 },
      { model: 'gpt-5', input: 5.00, cachedInput: 0.50, output: 40.00 },
      { model: 'gpt-5-mini', input: 1.00, cachedInput: 0.10, output: 8.00 },
      { model: 'gpt-5-nano', input: 0.20, cachedInput: 0.02, output: 1.60 },
      { model: 'gpt-5-pro', input: 60.00, cachedInput: null, output: 480.00 },
      { model: 'gpt-4.1', input: 8.00, cachedInput: null, output: 32.00 },
      { model: 'gpt-4.1-mini', input: 1.60, cachedInput: null, output: 6.40 },
      { model: 'gpt-4.1-nano', input: 0.40, cachedInput: null, output: 1.60 },
      { model: 'gpt-4o', input: 10.00, cachedInput: null, output: 40.00 },
      { model: 'gpt-4o-2024-05-13', input: 20.00, cachedInput: null, output: 60.00 },
      { model: 'gpt-4o-mini', input: 0.60, cachedInput: null, output: 2.40 },
    ],
  };

  const tiers = [
    { id: 'batch', name: 'Batch' },
    { id: 'flex', name: 'Flex' },
    { id: 'standard', name: 'Standard' },
    { id: 'priority', name: 'Priority' },
  ];

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '-';
    return `$${price.toFixed(2)}`;
  };

  const currentPricing = pricingData[activeTier] || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            LLM Token Pricing
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Prices per 1M tokens for different pricing tiers
          </p>
        </div>
      </div>

      {/* Tier Tabs */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex space-x-4 border-b border-gray-200">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => setActiveTier(tier.id)}
              className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTier === tier.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tier.name}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Input
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cached Input
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Output
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPricing.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.model}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPrice(item.input)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPrice(item.cachedInput)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPrice(item.output)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> All prices are shown per 1 million tokens. 
          Cached input prices are available for models that support prompt caching.
          Switch between tiers to see different pricing options.
        </p>
      </div>
    </div>
  );
};

export default LLMPricing;

