import { Body,Controller,Get,Post } from "@nestjs/common";
import { ApiOperation,ApiTags } from "@nestjs/swagger";
import { IgnoreCaptchaValidation } from "src/modules/shared/auth/application/decorators/ignore-captcha.decorator";
import { Public } from "src/modules/shared/auth/application/decorators/public.decorator";
import {
ContactFormDto,
DonationFormDto,
SignUpDto,
} from "../../application/dto/public.dto";
import { ContentService } from "../../application/services/content.service";
import { PublicService } from "../../application/services/public.service";

@ApiTags(PublicController.name)
@Controller("public")
@Public()
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly contentService: ContentService,
  ) {}

  @Get("team")
  @ApiOperation({ summary: "Get team members" })
  async getTeam() {
    return await this.publicService.getTeamMembers();
  }

  @Get("content")
  @ApiOperation({ summary: "Get public content" })
  @IgnoreCaptchaValidation()
  async getCpntent() {
    return await this.contentService.getPublicContent();
  }

  @Post("contact")
  @ApiOperation({ summary: "Submit contact form" })
  async contactUs(
    @Body() dto: ContactFormDto,
  ): Promise<{ id: string; success: boolean }> {
    return {
      id: await this.publicService.contactUs(dto),
      success: true,
    };
  }

  @Post("signup")
  @ApiOperation({ summary: "Sign up" })
  async signUp(
    @Body() dto: SignUpDto,
  ): Promise<{ id: string; success: boolean }> {
    return {
      id: await this.publicService.signUp(dto),
      success: true,
    };
  }

  @Post("donate")
  @ApiOperation({ summary: "Submit donation form" })
  async donate(
    @Body() dto: DonationFormDto,
  ): Promise<{ id: string; success: boolean }> {
    return {
      id: await this.publicService.donate(dto),
      success: true,
    };
  }
}
