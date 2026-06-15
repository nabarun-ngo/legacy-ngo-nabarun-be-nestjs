import { HttpService } from "@nestjs/axios";
import { Test,TestingModule } from "@nestjs/testing";
import { of } from "rxjs";
import { RecaptchaService } from "./google-recaptcha.service";

describe("RecaptchaService", () => {
  let service: RecaptchaService;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    process.env.GOOGLE_RECAPTCHA_SECURITY_KEY = "test-secret";

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecaptchaService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<RecaptchaService>(RecaptchaService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should use default threshold 0.7 if threshold is NaN", async () => {
    mockHttpService.post.mockReturnValue(
      of({
        data: {
          success: true,
          score: 0.6,
          action: "action",
        },
      }),
    );

    // If threshold is NaN, it should fall back to 0.7.
    // Score 0.6 < 0.7, so it should return false.
    const result = await service.verifyToken("token", "action", NaN);
    expect(result).toBe(false);
  });

  it("should use default threshold 0.7 if threshold is out of range (< 0)", async () => {
    mockHttpService.post.mockReturnValue(
      of({
        data: {
          success: true,
          score: 0.6,
          action: "action",
        },
      }),
    );

    const result = await service.verifyToken("token", "action", -1);
    expect(result).toBe(false); // falls back to 0.7
  });

  it("should use default threshold 0.7 if threshold is out of range (> 1)", async () => {
    mockHttpService.post.mockReturnValue(
      of({
        data: {
          success: true,
          score: 0.6,
          action: "action",
        },
      }),
    );

    const result = await service.verifyToken("token", "action", 2);
    expect(result).toBe(false); // falls back to 0.7
  });

  it("should pass if score is above valid threshold", async () => {
    mockHttpService.post.mockReturnValue(
      of({
        data: {
          success: true,
          score: 0.8,
          action: "action",
        },
      }),
    );

    const result = await service.verifyToken("token", "action", 0.5);
    expect(result).toBe(true);
  });

  it("should pass if score is equal to threshold", async () => {
    mockHttpService.post.mockReturnValue(
      of({
        data: {
          success: true,
          score: 0.5,
          action: "action",
        },
      }),
    );

    const result = await service.verifyToken("token", "action", 0.5);
    expect(result).toBe(true);
  });

  it("should fail if success is false", async () => {
    mockHttpService.post.mockReturnValue(
      of({
        data: {
          success: false,
        },
      }),
    );

    const result = await service.verifyToken("token", "action", 0.5);
    expect(result).toBe(false);
  });

  it("should fail if action mismatch", async () => {
    mockHttpService.post.mockReturnValue(
      of({
        data: {
          success: true,
          score: 0.9,
          action: "wrong-action",
        },
      }),
    );

    const result = await service.verifyToken("token", "action", 0.5);
    expect(result).toBe(false);
  });
});
