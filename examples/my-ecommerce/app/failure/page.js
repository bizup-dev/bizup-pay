"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FailurePage;
const link_1 = __importDefault(require("next/link"));
function FailurePage() {
    return (<div className="result-page">
      <div className="result-icon">❌</div>
      <h1 className="result-title">Payment Failed</h1>
      <p className="result-message">
        Something went wrong with your payment. Please try again or use a different payment method.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <link_1.default href="/checkout" className="btn btn-primary btn-lg">
          Try Again
        </link_1.default>
        <link_1.default href="/" className="btn btn-outline btn-lg">
          Back to Shop
        </link_1.default>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map