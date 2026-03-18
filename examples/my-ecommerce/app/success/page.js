"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SuccessPage;
const link_1 = __importDefault(require("next/link"));
function SuccessPage() {
    return (<div className="result-page">
      <div className="result-icon">✅</div>
      <h1 className="result-title">Payment Successful!</h1>
      <p className="result-message">
        Your order has been confirmed. You will receive a confirmation email shortly.
      </p>
      <link_1.default href="/" className="btn btn-primary btn-lg">
        Continue Shopping
      </link_1.default>
    </div>);
}
//# sourceMappingURL=page.js.map